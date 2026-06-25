import crypto from 'crypto';
import { PoolClient } from 'pg';

const ELIGIBLE_MANUAL_CHANNELS = new Set([
  'soil_moisture',
  'rain_condition',
  'plant_condition',
  'pest_disease_signs',
  'irrigation',
]);
const ELIGIBLE_PHYSICAL_CHANNELS = new Set([
  'temperature',
  'humidity',
  'pressure',
  'soil_moisture',
]);

export interface ContributionResult {
  batch_id: string;
  status: 'model_ready';
  execution_kind: 'real';
  eligible_feature_count: number;
  excluded_feature_count: number;
}

export async function prepareAcceptedReadingContribution(
  client: PoolClient,
  params: { deviceId: string; cycleId: string; readingId: string }
): Promise<ContributionResult> {
  const existing = await client.query(
    `
      SELECT batch.*
      FROM virtual_ndani_batch_readings link
      JOIN virtual_ndani_batches batch ON batch.batch_id = link.batch_id
      WHERE link.reading_id = $1
      LIMIT 1
    `,
    [params.readingId]
  );
  if (existing.rows[0]) return normalizeContribution(existing.rows[0]);

  const readingResult = await client.query(
    `
      SELECT quality_status, collection_mode, signature_verified
      FROM virtual_ndani_readings
      WHERE reading_id = $1 AND virtual_device_id = $2
      FOR UPDATE
    `,
    [params.readingId, params.deviceId]
  );
  if (readingResult.rows[0]?.quality_status !== 'accepted') {
    throw new Error('only_accepted_readings_are_model_eligible');
  }

  const fieldsResult = await client.query(
    'SELECT * FROM virtual_ndani_reading_fields WHERE reading_id = $1 ORDER BY channel_key',
    [params.readingId]
  );
  const decisions = fieldsResult.rows.map(featureDecision);
  const eligibleCount = decisions.filter((item) => item.decision === 'eligible').length;
  const excludedCount = decisions.length - eligibleCount;
  if (eligibleCount === 0) throw new Error('reading_has_no_eligible_features');

  const batchId = crypto.randomUUID();
  const batch = await client.query(
    `
      INSERT INTO virtual_ndani_batches (
        batch_id, virtual_device_id, status, execution_kind, reading_count,
        eligible_feature_count, excluded_feature_count, quality_summary_json, closed_at
      )
      VALUES (
        $1, $2, 'model_ready', 'real', 1, $3, $4, $5,
        EXTRACT(EPOCH FROM NOW())::BIGINT
      )
      RETURNING *
    `,
    [
      batchId,
      params.deviceId,
      eligibleCount,
      excludedCount,
      JSON.stringify({
        quality_status: 'accepted',
        model_ready_definition: 'eligible_for_research_dataset',
        model_training_completed: false,
        proof_verified: false,
        reward_paid: false,
      }),
    ]
  );
  await client.query(
    `
      INSERT INTO virtual_ndani_batch_readings
        (batch_id, reading_id, inclusion_status)
      VALUES ($1, $2, 'included')
    `,
    [batchId, params.readingId]
  );
  for (const item of decisions) {
    await client.query(
      `
        INSERT INTO virtual_ndani_feature_decisions (
          feature_decision_id, batch_id, reading_id, reading_field_id,
          channel_key, feature_key, source_class, measurement_kind,
          confidence, decision, reason, transformation_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        crypto.randomUUID(), batchId, params.readingId, item.readingFieldId,
        item.channelKey, item.featureKey, item.sourceClass, item.measurementKind,
        item.confidence, item.decision, item.reason, item.transformationVersion,
      ]
    );
  }

  await insertEvent(client, params, 'contribution_batch_prepared', 'real', 'complete', {
    batch_id: batchId,
    reading_count: 1,
    eligible_feature_count: eligibleCount,
    excluded_feature_count: excludedCount,
  }, batchId);
  await insertEvent(client, params, 'model_readiness_updated', 'real', 'model_ready', {
    batch_id: batchId,
    meaning: 'eligible_for_research_dataset',
    training_run_id: null,
  }, batchId);
  if (readingResult.rows[0].collection_mode === 'physical_auto') {
    await insertEvent(
      client,
      params,
      'physical_device_attestation',
      'real',
      readingResult.rows[0].signature_verified ? 'signature_verified' : 'signature_missing',
      {
        batch_id: batchId,
        signature_verified: Boolean(readingResult.rows[0].signature_verified),
        zk_proof_verified: false,
      },
      batchId
    );
  } else {
    await insertEvent(
      client,
      params,
      'manual_reading_proof',
      'not_applicable',
      'not_device_signed',
      {
        batch_id: batchId,
        reason: 'manual_proxy_reading_has_no_physical_device_signature',
      },
      batchId
    );
  }
  for (const stage of [
    'training_run',
    'model_update',
    'federated_aggregation',
    'contribution_scoring',
    'reward_payment',
  ]) {
    await insertEvent(client, params, stage, 'pending', 'not_started', {
      batch_id: batchId,
    }, batchId);
  }
  await client.query(
    `
      UPDATE virtual_ndani_cycles
      SET status = 'batched', updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE cycle_id = $1
    `,
    [params.cycleId]
  );
  await client.query(
    `
      UPDATE virtual_ndani_devices
      SET status = 'contribution_recorded',
          updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE virtual_device_id = $1
    `,
    [params.deviceId]
  );
  return normalizeContribution(batch.rows[0]);
}

export async function recordFlaggedReadingContributionHold(
  client: PoolClient,
  params: { deviceId: string; cycleId: string; readingId: string }
): Promise<void> {
  const existing = await client.query(
    `
      SELECT 1 FROM virtual_ndani_pipeline_events
      WHERE reading_id = $1 AND stage = 'model_readiness_updated'
      LIMIT 1
    `,
    [params.readingId]
  );
  if (existing.rows[0]) return;
  await insertEvent(
    client,
    params,
    'model_readiness_updated',
    'pending',
    'coordinator_review_required',
    { eligible_for_research_dataset: false }
  );
}

function featureDecision(field: any) {
  const eligibleManual = (
    field.measurement_kind === 'observed'
    && field.source_class === 'manual_proxy'
    && field.value_json !== null
    && ELIGIBLE_MANUAL_CHANNELS.has(field.channel_key)
  );
  const eligiblePhysical = (
    field.measurement_kind === 'measured'
    && field.source_class === 'physical_sensor'
    && field.value_json !== null
    && ELIGIBLE_PHYSICAL_CHANNELS.has(field.channel_key)
  );
  const eligible = eligibleManual || eligiblePhysical;
  return {
    readingFieldId: field.reading_field_id,
    channelKey: field.channel_key,
    featureKey: eligiblePhysical
      ? `${field.channel_key}_physical_numeric_v1`
      : eligibleManual
        ? `${field.channel_key}_category_v1`
        : null,
    sourceClass: field.source_class,
    measurementKind: field.measurement_kind,
    confidence: field.confidence === null ? null : Number(field.confidence),
    decision: eligible ? 'eligible' : 'excluded',
    reason: eligiblePhysical
      ? 'verified_physical_numeric_feature'
      : eligibleManual
        ? 'accepted_manual_categorical_feature'
      : field.measurement_kind === 'unavailable'
        ? 'hardware_channel_unavailable'
        : 'feature_policy_excluded',
    transformationVersion: eligiblePhysical
      ? 'physical-numeric-provenance-v1'
      : eligibleManual
        ? 'categorical-provenance-v1'
        : null,
  };
}

async function insertEvent(
  client: PoolClient,
  params: { deviceId: string; cycleId: string; readingId: string },
  stage: string,
  executionKind: string,
  status: string,
  detail: Record<string, unknown>,
  batchId?: string
) {
  await client.query(
    `
      INSERT INTO virtual_ndani_pipeline_events (
        pipeline_event_id, virtual_device_id, cycle_id, reading_id, batch_id,
        stage, execution_kind, status, detail_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      crypto.randomUUID(), params.deviceId, params.cycleId, params.readingId,
      batchId ?? null, stage, executionKind, status, JSON.stringify(detail),
    ]
  );
}

function normalizeContribution(row: any): ContributionResult {
  return {
    batch_id: row.batch_id,
    status: row.status,
    execution_kind: row.execution_kind,
    eligible_feature_count: Number(row.eligible_feature_count),
    excluded_feature_count: Number(row.excluded_feature_count),
  };
}
