import crypto from 'crypto';
import { PoolClient } from 'pg';
import { ManualObservationDraft } from '../types/manualObservation';
import {
  prepareAcceptedReadingContribution,
  recordFlaggedReadingContributionHold,
} from './contributionPipeline';

export interface AgentVirtualNdaniResult {
  virtual_device_id: string;
  device_code: string;
  cycle_id: string;
  reading_id: string;
  quality_status: 'accepted' | 'flagged';
  coordinator_review_required: boolean;
  model_ready: boolean;
  eligible_feature_count: number;
}

export async function createVirtualNdaniReadingFromAgent(
  client: PoolClient,
  params: {
    conversationId: string;
    farmerId: string;
    farmId: string;
    manualObservationId: string;
    draft: ManualObservationDraft;
    confidence: Record<string, number | undefined>;
    validationStatus: 'valid' | 'flagged' | 'invalid';
    validationErrors: string[];
  }
): Promise<AgentVirtualNdaniResult> {
  const existing = await client.query(
    `
      SELECT
        reading.reading_id,
        reading.cycle_id,
        reading.virtual_device_id,
        reading.quality_status,
        device.device_code
      FROM virtual_ndani_readings reading
      JOIN virtual_ndani_devices device
        ON device.virtual_device_id = reading.virtual_device_id
      WHERE reading.conversation_id = $1
      LIMIT 1
    `,
    [params.conversationId]
  );
  if (existing.rows[0]) {
    return resultFromRow(existing.rows[0]);
  }

  const farm = await client.query(
    'SELECT site_id FROM farms WHERE farm_id = $1',
    [params.farmId]
  );
  const siteId = farm.rows[0]?.site_id;
  if (!siteId) throw new Error('farm site not found');

  const deviceResult = await client.query(
    `
      INSERT INTO virtual_ndani_devices (
        virtual_device_id,
        device_code,
        farm_id,
        site_id,
        status,
        activated_at
      )
      VALUES ($1, $2, $3, $4, 'reading_due', EXTRACT(EPOCH FROM NOW())::BIGINT)
      ON CONFLICT (farm_id) DO UPDATE SET site_id = EXCLUDED.site_id
      RETURNING virtual_device_id, device_code
    `,
    [crypto.randomUUID(), deviceCode(siteId), params.farmId, siteId]
  );
  const device = deviceResult.rows[0];
  await ensureChannels(client, device.virtual_device_id);

  const openCycle = await client.query(
    `
      SELECT *
      FROM virtual_ndani_cycles
      WHERE virtual_device_id = $1
        AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
      ORDER BY scheduled_for DESC
      LIMIT 1
      FOR UPDATE
    `,
    [device.virtual_device_id]
  );
  let cycle = openCycle.rows[0];
  if (cycle && cycle.collection_mode && cycle.collection_mode !== 'manual_agent') {
    throw new Error('virtual_ndani_cycle_mode_conflict');
  }
  if (!cycle) {
    const cycleResult = await client.query(
      `
        INSERT INTO virtual_ndani_cycles (
          cycle_id,
          virtual_device_id,
          scheduled_for,
          due_at,
          started_at,
          status,
          collection_mode,
          created_by
        )
        VALUES (
          $1,
          $2,
          EXTRACT(EPOCH FROM NOW())::BIGINT,
          EXTRACT(EPOCH FROM NOW())::BIGINT,
          EXTRACT(EPOCH FROM NOW())::BIGINT,
          'started',
          'manual_agent',
          $3
        )
        RETURNING *
      `,
      [
        crypto.randomUUID(),
        device.virtual_device_id,
        `agent:${params.conversationId}`,
      ]
    );
    cycle = cycleResult.rows[0];
    await insertPipelineEvent(
      client,
      device.virtual_device_id,
      cycle.cycle_id,
      'collection_started',
      'complete',
      { collection_mode: 'manual_agent' }
    );
  }

  const riskFlags = riskFlagsFor(params.draft, params.validationErrors);
  const flagged = params.validationStatus === 'flagged' || riskFlags.length > 0;
  const qualityStatus = flagged ? 'flagged' : 'accepted';
  let contribution:
    | Awaited<ReturnType<typeof prepareAcceptedReadingContribution>>
    | undefined;
  const readingId = crypto.randomUUID();
  await client.query(
    `
      INSERT INTO virtual_ndani_readings (
        reading_id,
        virtual_device_id,
        cycle_id,
        farmer_id,
        farm_id,
        conversation_id,
        manual_observation_id,
        collection_mode,
        observed_at,
        confirmed_at,
        quality_status,
        risk_flags_json,
        context_json,
        schema_version,
        policy_version
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'manual_agent',
        EXTRACT(EPOCH FROM NOW())::BIGINT,
        EXTRACT(EPOCH FROM NOW())::BIGINT,
        $8, $9, $10,
        'virtual-ndani-reading-v1',
        'human-assisted-agent-v1'
      )
    `,
    [
      readingId,
      device.virtual_device_id,
      cycle.cycle_id,
      params.farmerId,
      params.farmId,
      params.conversationId,
      params.manualObservationId,
      qualityStatus,
      JSON.stringify(riskFlags),
      JSON.stringify({
        crop_type: params.draft.crop_type,
        crop_stage: params.draft.crop_stage,
      }),
    ]
  );

  const fields = agentFields(params.draft, params.confidence);
  for (const field of fields) {
    await client.query(
      `
        INSERT INTO virtual_ndani_reading_fields (
          reading_field_id,
          reading_id,
          channel_key,
          value_json,
          unit,
          measurement_kind,
          source_class,
          source_reference,
          confidence,
          evidence,
          review_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        crypto.randomUUID(),
        readingId,
        field.channelKey,
        field.value === null ? null : JSON.stringify(field.value),
        field.unit,
        field.measurementKind,
        field.sourceClass,
        field.sourceReference,
        field.confidence,
        field.evidence,
        flagged ? 'needs_followup' : 'accepted',
      ]
    );
  }

  await client.query(
    `
      UPDATE virtual_ndani_cycles
      SET status = $1,
          completed_at = EXTRACT(EPOCH FROM NOW())::BIGINT,
          manual_duration_seconds = CASE
            WHEN started_at IS NULL THEN manual_duration_seconds
            ELSE GREATEST(
              0,
              EXTRACT(EPOCH FROM NOW())::BIGINT - started_at
            )
          END,
          updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE cycle_id = $2
    `,
    [flagged ? 'flagged' : 'accepted', cycle.cycle_id]
  );
  await client.query(
    `
      UPDATE virtual_ndani_devices
      SET status = $1, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE virtual_device_id = $2
    `,
    [
      flagged ? 'needs_coordinator_review' : 'reading_accepted',
      device.virtual_device_id,
    ]
  );
  await insertPipelineEvent(
    client,
    device.virtual_device_id,
    cycle.cycle_id,
    'agent_observation_structured',
    qualityStatus,
    {
      reading_id: readingId,
      conversation_id: params.conversationId,
      manual_fields: 5,
      unavailable_hardware_fields: 3,
    }
  );
  await insertPipelineEvent(
    client,
    device.virtual_device_id,
    cycle.cycle_id,
    'observation_confirmed',
    qualityStatus,
    {
      reading_id: readingId,
      collection_mode: 'manual_agent',
      risk_flags: riskFlags,
    }
  );
  await insertPipelineEvent(
    client,
    device.virtual_device_id,
    cycle.cycle_id,
    'quality_checks_completed',
    qualityStatus,
    { coordinator_review_required: flagged }
  );
  if (flagged) {
    await recordFlaggedReadingContributionHold(client, {
      deviceId: device.virtual_device_id,
      cycleId: cycle.cycle_id,
      readingId,
    });
  } else {
    contribution = await prepareAcceptedReadingContribution(client, {
      deviceId: device.virtual_device_id,
      cycleId: cycle.cycle_id,
      readingId,
    });
  }

  return {
    virtual_device_id: device.virtual_device_id,
    device_code: device.device_code,
    cycle_id: cycle.cycle_id,
    reading_id: readingId,
    quality_status: qualityStatus,
    coordinator_review_required: flagged,
    model_ready: Boolean(contribution),
    eligible_feature_count: contribution?.eligible_feature_count ?? 0,
  };
}

function agentFields(
  draft: ManualObservationDraft,
  confidence: Record<string, number | undefined>
) {
  const unavailable = [
    ['temperature', 'celsius'],
    ['humidity', 'percent'],
    ['pressure', 'hpa'],
  ].map(([channelKey, unit]) => ({
    channelKey,
    value: null,
    unit,
    measurementKind: 'unavailable',
    sourceClass: null,
    sourceReference: null,
    confidence: null,
    evidence: null,
  }));
  const mappings = [
    ['soil_moisture', 'soil_condition'],
    ['rain_condition', 'rain_level'],
    ['plant_condition', 'plant_condition'],
    ['pest_disease_signs', 'pest_or_disease_signs'],
    ['irrigation', 'irrigated_today'],
  ] as const;
  const observed = mappings.map(([channelKey, draftKey]) => ({
    channelKey,
    value: draft[draftKey] ?? null,
    unit: null,
    measurementKind: 'observed',
    sourceClass: 'manual_proxy',
    sourceReference: 'ai_farm_agent_confirmation',
    confidence: confidence[draftKey] ?? null,
    evidence: String(draft[draftKey] ?? ''),
  }));
  return [...unavailable, ...observed];
}

function riskFlagsFor(draft: ManualObservationDraft, validationErrors: string[]): string[] {
  const flags: string[] = [];
  if (draft.plant_condition === 'poor') flags.push('poor_plant_condition');
  if (draft.pest_or_disease_signs === 'severe') {
    flags.push('severe_pest_or_disease_signs');
  }
  if (validationErrors.some((error) => error.includes('waterlogged soil'))) {
    flags.push('waterlogged_without_reported_water_source');
  }
  return flags;
}

async function insertPipelineEvent(
  client: PoolClient,
  deviceId: string,
  cycleId: string,
  stage: string,
  status: string,
  detail: Record<string, unknown>
): Promise<void> {
  await client.query(
    `
      INSERT INTO virtual_ndani_pipeline_events (
        pipeline_event_id,
        virtual_device_id,
        cycle_id,
        stage,
        execution_kind,
        status,
        detail_json
      )
      VALUES ($1, $2, $3, $4, 'real', $5, $6)
    `,
    [
      crypto.randomUUID(),
      deviceId,
      cycleId,
      stage,
      status,
      JSON.stringify(detail),
    ]
  );
}

function resultFromRow(row: any): AgentVirtualNdaniResult {
  return {
    virtual_device_id: row.virtual_device_id,
    device_code: row.device_code,
    cycle_id: row.cycle_id,
    reading_id: row.reading_id,
    quality_status: row.quality_status,
    coordinator_review_required: row.quality_status === 'flagged',
    model_ready: false,
    eligible_feature_count: 0,
  };
}

function deviceCode(siteId: string): string {
  return `NDANI-ODZI-${siteId.replace(/^site-/i, '').toUpperCase()}`;
}

async function ensureChannels(client: PoolClient, deviceId: string): Promise<void> {
  const channels = [
    ['temperature', 'Temperature', 'hardware_or_approved_external_only', 'BME280', '°C'],
    ['humidity', 'Humidity', 'hardware_or_approved_external_only', 'BME280', '%'],
    ['pressure', 'Atmospheric pressure', 'hardware_or_approved_external_only', 'BME280', 'hPa'],
    ['soil_moisture', 'Soil moisture', 'manual_category_allowed', 'capacitive_soil_sensor', '%'],
    ['rain_condition', 'Rain condition', 'manual_category_or_external', 'future_rain_sensor', null],
    ['plant_condition', 'Plant condition', 'human_observation_only', null, null],
    ['pest_disease_signs', 'Pest or disease signs', 'human_observation_only', null, null],
    ['irrigation', 'Irrigation', 'manual_event_allowed', 'future_irrigation_integration', null],
  ] as const;
  for (let index = 0; index < channels.length; index += 1) {
    const [key, name, policy, sensor, unit] = channels[index];
    await client.query(
      `
        INSERT INTO virtual_ndani_channels (
          channel_id,
          virtual_device_id,
          channel_key,
          display_name,
          pilot_source_policy,
          future_sensor_type,
          future_unit,
          display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (virtual_device_id, channel_key) DO NOTHING
      `,
      [
        crypto.randomUUID(),
        deviceId,
        key,
        name,
        policy,
        sensor,
        unit,
        index + 1,
      ]
    );
  }
}
