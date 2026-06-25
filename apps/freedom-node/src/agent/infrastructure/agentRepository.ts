import crypto from 'crypto';
import { PoolClient } from 'pg';
import { db } from '../../database';
import { ManualObservationDraft } from '../../types/manualObservation';
import { validateManualObservation } from '../../services/manualObservationValidation';
import {
  ObservationDecision,
  ObservationField,
  decideObservationNextStep,
} from '../domain/observationExtraction';
import {
  AgentEvent,
  AgentState,
  AgentTransition,
  transitionAgentState,
} from '../domain/stateMachine';
import { ModelExtractionResult } from './modelGateway';
import {
  AgentVirtualNdaniResult,
  createVirtualNdaniReadingFromAgent,
} from '../../virtual-ndani/agentReadingAdapter';

export interface AgentConversation {
  conversation_id: string;
  farmer_id: string;
  farm_id: string;
  channel: 'web' | 'whatsapp' | 'coordinator' | 'api';
  state: AgentState;
  status: string;
  version: number;
  observation_draft: ManualObservationDraft;
  field_confidence: Partial<Record<ObservationField, number>>;
  pending_field?: ObservationField;
  pending_value?: string;
}

export interface AgentProcessingContext {
  state: AgentState;
  draft: ManualObservationDraft;
  confidence: Partial<Record<ObservationField, number>>;
  pendingField?: ObservationField;
  pendingValue?: string;
}

export const agentRepository = {
  async getProcessingContext(params: {
    farmerId: string;
    farmId: string;
  }): Promise<AgentProcessingContext> {
    const result = await db.query(
      `
        SELECT *
        FROM agent_conversations
        WHERE farmer_id = $1
          AND farm_id = $2
          AND channel = 'web'
          AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [params.farmerId, params.farmId]
    );
    if (!result.rows[0]) {
      return { state: 'idle', draft: {}, confidence: {} };
    }
    const conversation = parseConversation(result.rows[0]);
    return {
      state: conversation.state,
      draft: conversation.observation_draft,
      confidence: conversation.field_confidence,
      pendingField: conversation.pending_field,
      pendingValue: conversation.pending_value,
    };
  },

  async getLatestWebConversation(params: {
    farmerId: string;
    farmId: string;
  }): Promise<{
    conversation: AgentConversation;
    messages: Array<{
      message_id: string;
      direction: 'inbound' | 'outbound';
      text: string;
      created_at: number;
    }>;
  } | undefined> {
    const conversationResult = await db.query(
      `
        SELECT *
        FROM agent_conversations
        WHERE farmer_id = $1
          AND farm_id = $2
          AND channel = 'web'
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [params.farmerId, params.farmId]
    );
    if (!conversationResult.rows[0]) return undefined;

    const conversation = parseConversation(conversationResult.rows[0]);
    const messageResult = await db.query(
      `
        SELECT message_id, direction, normalized_text, created_at
        FROM agent_messages
        WHERE conversation_id = $1
        ORDER BY message_sequence ASC
        LIMIT 100
      `,
      [conversation.conversation_id]
    );
    return {
      conversation,
      messages: messageResult.rows.map((row) => ({
        message_id: row.message_id,
        direction: row.direction,
        text: row.normalized_text || '',
        created_at: Number(row.created_at),
      })),
    };
  },

  async processWebMessage(params: {
    farmerId: string;
    farmId: string;
    text: string;
    externalMessageId?: string;
    extractionResult?: ModelExtractionResult;
    controlEvent?: 'CONFIRM_SUBMIT' | 'EDIT' | 'CANCEL';
  }): Promise<{
    conversation: AgentConversation;
    transition: AgentTransition;
    reply: string;
    duplicate: boolean;
    decision?: ObservationDecision;
    virtualNdani?: AgentVirtualNdaniResult;
  }> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const duplicate = await findDuplicate(client, params);
      if (duplicate) {
        await client.query('COMMIT');
        return duplicate;
      }

      const conversation = await findOrCreateConversation(client, params);
      const inboundMessageId = crypto.randomUUID();
      await insertMessage(client, {
        messageId: inboundMessageId,
        conversationId: conversation.conversation_id,
        externalMessageId: params.externalMessageId,
        direction: 'inbound',
        text: params.text.trim(),
        language: params.extractionResult?.extraction.language || 'unknown',
      });

      let transition: AgentTransition;
      let reply: string;
      let decision: ObservationDecision | undefined;
      let extractionEventId: string | undefined;
      let virtualNdani: AgentVirtualNdaniResult | undefined;

      if (params.controlEvent) {
        transition = transitionAgentState(conversation.state, params.controlEvent);
        reply = await applyControlEvent(client, conversation, params.controlEvent);
      } else if (params.extractionResult) {
        decision = decideObservationNextStep({
          currentDraft: conversation.observation_draft,
          currentConfidence: conversation.field_confidence,
          extraction: params.extractionResult.extraction,
        });
        transition = transitionAgentState(conversation.state, decision.event);
        reply = decision.reply;
        extractionEventId = await insertExtractionEvent(
          client,
          conversation.conversation_id,
          inboundMessageId,
          params.extractionResult
        );
        await insertRuleDecision(client, conversation.conversation_id, extractionEventId, decision);
        await insertCostEvent(client, conversation, params.extractionResult);
        conversation.observation_draft = decision.draft;
        conversation.field_confidence = decision.confidence;
        conversation.pending_field = decision.selectedField;
        conversation.pending_value = decision.selectedValue;
      } else {
        transition = transitionAgentState(conversation.state, 'TEXT_RECEIVED');
        reply = 'Tell me what you noticed on the farm today. You may use Shona or English.';
      }

      conversation.state = transition.nextState;
      conversation.status = statusForState(transition.nextState);
      conversation.version += 1;
      if (params.controlEvent === 'EDIT') {
        conversation.observation_draft = {};
        conversation.field_confidence = {};
        conversation.pending_field = undefined;
        conversation.pending_value = undefined;
      }
      await updateConversation(client, conversation, params.extractionResult?.promptVersion);
      await insertTransition(client, conversation.conversation_id, transition);

      if (transition.nextState === 'submitted') {
        virtualNdani = await submitCanonicalObservation(client, conversation);
        reply = virtualNdani.coordinator_review_required
          ? `Your observation was added to ${virtualNdani.device_code}. It needs coordinator follow-up, and no unavailable sensor measurements were invented.`
          : `Your observation was added to ${virtualNdani.device_code}. Five farmer observations are ready for an EdgeChain research dataset. No model has been trained or changed yet, and temperature, humidity, and pressure remain unavailable until hardware is connected.`;
      }

      await insertMessage(client, {
        messageId: crypto.randomUUID(),
        conversationId: conversation.conversation_id,
        direction: 'outbound',
        text: reply,
        language: params.extractionResult?.extraction.language || 'en',
      });

      await client.query('COMMIT');
      return {
        conversation,
        transition,
        reply,
        duplicate: false,
        decision,
        virtualNdani,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

async function findDuplicate(
  client: PoolClient,
  params: {
    farmerId: string;
    farmId: string;
    externalMessageId?: string;
  }
) {
  if (!params.externalMessageId) return undefined;
  const duplicate = await client.query(
    `
      SELECT message.conversation_id
      FROM agent_messages message
      JOIN agent_conversations conversation
        ON conversation.conversation_id = message.conversation_id
      WHERE message.external_message_id = $1
        AND message.direction = 'inbound'
        AND conversation.farmer_id = $2
        AND conversation.farm_id = $3
      LIMIT 1
    `,
    [params.externalMessageId, params.farmerId, params.farmId]
  );
  if (!duplicate.rows[0]) return undefined;
  const existing = await client.query(
    'SELECT * FROM agent_conversations WHERE conversation_id = $1',
    [duplicate.rows[0].conversation_id]
  );
  const conversation = parseConversation(existing.rows[0]);
  return {
    conversation,
    transition: {
      previousState: conversation.state,
      event: 'TIMEOUT' as const,
      nextState: conversation.state,
      reason: 'duplicate_message_replayed',
      ruleVersion: 'agent-state-v1',
    },
    reply: 'This message was already received.',
    duplicate: true,
  };
}

async function findOrCreateConversation(
  client: PoolClient,
  params: { farmerId: string; farmId: string }
): Promise<AgentConversation> {
  const result = await client.query(
    `
      SELECT *
      FROM agent_conversations
      WHERE farmer_id = $1
        AND farm_id = $2
        AND channel = 'web'
        AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [params.farmerId, params.farmId]
  );
  if (result.rows[0]) return parseConversation(result.rows[0]);

  const conversation: AgentConversation = {
    conversation_id: crypto.randomUUID(),
    farmer_id: params.farmerId,
    farm_id: params.farmId,
    channel: 'web',
    state: 'collecting_observation',
    status: 'active',
    version: 1,
    observation_draft: {},
    field_confidence: {},
  };
  await client.query(
    `
      INSERT INTO agent_conversations
        (conversation_id, farmer_id, farm_id, channel, state, status, last_message_at)
      VALUES ($1, $2, $3, 'web', 'collecting_observation', 'active',
        EXTRACT(EPOCH FROM NOW())::BIGINT)
    `,
    [conversation.conversation_id, conversation.farmer_id, conversation.farm_id]
  );
  await insertTransition(
    client,
    conversation.conversation_id,
    transitionAgentState('idle', 'START_OBSERVATION')
  );
  return conversation;
}

async function applyControlEvent(
  client: PoolClient,
  conversation: AgentConversation,
  event: 'CONFIRM_SUBMIT' | 'EDIT' | 'CANCEL'
): Promise<string> {
  if (event === 'CONFIRM_SUBMIT') {
    return 'Your observation has been submitted for EdgeChain review.';
  }
  if (event === 'EDIT') {
    return 'Let us start again. Tell me which crop you are reporting.';
  }
  return 'Observation cancelled. Start again whenever you are ready.';
}

async function updateConversation(
  client: PoolClient,
  conversation: AgentConversation,
  promptVersion?: string
): Promise<void> {
  await client.query(
    `
      UPDATE agent_conversations
      SET state = $1,
          status = $2,
          version = $3,
          observation_draft_json = $4,
          field_confidence_json = $5,
          pending_field = $6,
          pending_value = $7,
          prompt_version = COALESCE($8, prompt_version),
          last_message_at = EXTRACT(EPOCH FROM NOW())::BIGINT,
          updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE conversation_id = $9
    `,
    [
      conversation.state,
      conversation.status,
      conversation.version,
      JSON.stringify(conversation.observation_draft),
      JSON.stringify(conversation.field_confidence),
      conversation.pending_field || null,
      conversation.pending_value || null,
      promptVersion || null,
      conversation.conversation_id,
    ]
  );
}

async function insertMessage(
  client: PoolClient,
  message: {
    messageId: string;
    conversationId: string;
    externalMessageId?: string;
    direction: 'inbound' | 'outbound';
    text: string;
    language: string;
  }
): Promise<void> {
  await client.query(
    `
      INSERT INTO agent_messages
        (message_id, conversation_id, external_message_id, direction, message_type,
         normalized_text, language)
      VALUES ($1, $2, $3, $4, 'text', $5, $6)
    `,
    [
      message.messageId,
      message.conversationId,
      message.externalMessageId || null,
      message.direction,
      message.text,
      message.language,
    ]
  );
}

async function insertTransition(
  client: PoolClient,
  conversationId: string,
  transition: AgentTransition
): Promise<void> {
  await client.query(
    `
      INSERT INTO agent_state_transitions
        (transition_id, conversation_id, previous_state, event, next_state, rule_version, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      crypto.randomUUID(),
      conversationId,
      transition.previousState,
      transition.event,
      transition.nextState,
      transition.ruleVersion,
      transition.reason,
    ]
  );
}

async function insertExtractionEvent(
  client: PoolClient,
  conversationId: string,
  messageId: string,
  result: ModelExtractionResult
): Promise<string> {
  const id = crypto.randomUUID();
  await client.query(
    `
      INSERT INTO agent_extraction_events
        (extraction_event_id, conversation_id, message_id, provider, model,
         prompt_version, schema_version, output_json, validation_status,
         input_tokens, output_tokens, latency_ms, estimated_cost_usd, error_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      id,
      conversationId,
      messageId,
      result.provider,
      result.model,
      result.promptVersion,
      result.schemaVersion,
      JSON.stringify(result.extraction),
      result.validationStatus,
      result.inputTokens ?? null,
      result.outputTokens ?? null,
      result.latencyMs,
      result.estimatedCostUsd,
      result.errorCode || null,
    ]
  );
  return id;
}

async function insertRuleDecision(
  client: PoolClient,
  conversationId: string,
  extractionEventId: string,
  decision: ObservationDecision
): Promise<void> {
  await client.query(
    `
      INSERT INTO agent_rule_decisions
        (rule_decision_id, conversation_id, extraction_event_id, rule_id, rule_version,
         inputs_json, result, selected_field, explanation_key)
      VALUES ($1, $2, $3, 'observation_follow_up', 'follow-up-v1', $4, $5, $6, $7)
    `,
    [
      crypto.randomUUID(),
      conversationId,
      extractionEventId,
      JSON.stringify({
        accepted_fields: decision.acceptedFields,
        confirmation_fields: decision.confirmationFields,
        risk_flags: decision.riskFlags,
        selected_value: decision.selectedValue,
        draft: decision.draft,
      }),
      decision.ruleResult,
      decision.selectedField || null,
      decision.explanationKey,
    ]
  );
}

async function insertCostEvent(
  client: PoolClient,
  conversation: AgentConversation,
  result: ModelExtractionResult
): Promise<void> {
  await client.query(
    `
      INSERT INTO agent_cost_events
        (cost_event_id, farmer_id, farm_id, conversation_id, task_type,
         provider, model, input_tokens, output_tokens, estimated_cost_usd)
      VALUES ($1, $2, $3, $4, 'text_extraction', $5, $6, $7, $8, $9)
    `,
    [
      crypto.randomUUID(),
      conversation.farmer_id,
      conversation.farm_id,
      conversation.conversation_id,
      result.provider,
      result.model,
      result.inputTokens ?? null,
      result.outputTokens ?? null,
      result.estimatedCostUsd,
    ]
  );
}

async function submitCanonicalObservation(
  client: PoolClient,
  conversation: AgentConversation
): Promise<AgentVirtualNdaniResult> {
  const farmResult = await client.query(
    'SELECT site_id FROM farms WHERE farm_id = $1',
    [conversation.farm_id]
  );
  const siteId = farmResult.rows[0]?.site_id;
  if (!siteId) throw new Error('farm site not found');

  const sessionId = crypto.randomUUID();
  const observationId = crypto.randomUUID();
  const validation = validateManualObservation({
    ...conversation.observation_draft,
    site_id: siteId,
  });
  await client.query(
    `
      INSERT INTO manual_observation_sessions
        (session_id, channel, current_step, status, draft_json)
      VALUES ($1, 'api', 'submitted', 'submitted', $2)
    `,
    [sessionId, JSON.stringify(conversation.observation_draft)]
  );
  await client.query(
    `
      INSERT INTO manual_observations
        (observation_id, session_id, site_id, channel, observation_date,
         payload_json, validation_status, validation_errors_json, review_status)
      VALUES ($1, $2, $3, 'api', $4, $5, $6, $7, $8)
    `,
    [
      observationId,
      sessionId,
      siteId,
      new Date().toISOString().slice(0, 10),
      JSON.stringify(conversation.observation_draft),
      validation.status,
      JSON.stringify(validation.errors),
      validation.status === 'flagged' ? 'needs_followup' : 'pending',
    ]
  );
  return createVirtualNdaniReadingFromAgent(client, {
    conversationId: conversation.conversation_id,
    farmerId: conversation.farmer_id,
    farmId: conversation.farm_id,
    manualObservationId: observationId,
    draft: conversation.observation_draft,
    confidence: conversation.field_confidence,
    validationStatus: validation.status,
    validationErrors: validation.errors,
  });
}

function statusForState(state: AgentState): string {
  if (state === 'submitted') return 'submitted';
  if (state === 'cancelled') return 'cancelled';
  if (state === 'flagged_for_coordinator') return 'flagged';
  return 'active';
}

function parseConversation(row: any): AgentConversation {
  return {
    conversation_id: row.conversation_id,
    farmer_id: row.farmer_id,
    farm_id: row.farm_id,
    channel: row.channel,
    state: row.state,
    status: row.status,
    version: Number(row.version),
    observation_draft: parseJson(row.observation_draft_json),
    field_confidence: parseJson(row.field_confidence_json),
    pending_field: row.pending_field || undefined,
    pending_value: row.pending_value || undefined,
  };
}

function parseJson(value: unknown): any {
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
