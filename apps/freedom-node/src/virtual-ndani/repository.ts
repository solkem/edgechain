import crypto from 'crypto';
import { PoolClient } from 'pg';
import { db } from '../database';
import { CollectionMode } from './domain';
import { ValidatedGuidedReading } from './guidedReading';
import {
  prepareAcceptedReadingContribution,
  recordFlaggedReadingContributionHold,
} from './contributionPipeline';

const CHANNELS = [
  ['temperature', 'Temperature', 'hardware_or_approved_external_only', 'BME280', '°C'],
  ['humidity', 'Humidity', 'hardware_or_approved_external_only', 'BME280', '%'],
  ['pressure', 'Atmospheric pressure', 'hardware_or_approved_external_only', 'BME280', 'hPa'],
  ['soil_moisture', 'Soil moisture', 'manual_category_allowed', 'capacitive_soil_sensor', '%'],
  ['rain_condition', 'Rain condition', 'manual_category_or_external', 'future_rain_sensor', null],
  ['plant_condition', 'Plant condition', 'human_observation_only', null, null],
  ['pest_disease_signs', 'Pest or disease signs', 'human_observation_only', null, null],
  ['irrigation', 'Irrigation', 'manual_event_allowed', 'future_irrigation_integration', null],
] as const;

export interface VirtualNdaniSummaryRow {
  virtual_device_id: string;
  device_code: string;
  farm_id: string;
  farm_display_name: string;
  site_id: string;
  mode: string;
  status: string;
  firmware_profile: string;
  physical_device_pubkey: string | null;
  physical_bound_at: number | null;
  physical_binding_version: string | null;
  expected_interval_minutes: number;
  future_physical_interval_minutes: number;
  provisioned_at: number;
  activated_at: number | null;
  current_cycle_id: string | null;
  current_cycle_status: string | null;
  current_collection_mode: string | null;
  scheduled_for: number | null;
  due_at: number | null;
}

export const virtualNdaniRepository = {
  async ensureForFarmer(farmerId: string): Promise<void> {
    const farms = await db.query(
      `
        SELECT farm.farm_id, farm.site_id
        FROM farm_memberships membership
        JOIN farms farm ON farm.farm_id = membership.farm_id
        WHERE membership.farmer_id = $1
          AND farm.status = 'active'
          AND membership.valid_from <= EXTRACT(EPOCH FROM NOW())::BIGINT
          AND (membership.valid_to IS NULL OR membership.valid_to > EXTRACT(EPOCH FROM NOW())::BIGINT)
      `,
      [farmerId]
    );

    for (const farm of farms.rows) {
      await ensureDeviceForFarm(farm.farm_id, farm.site_id);
    }
  },

  async listForFarmer(farmerId: string): Promise<VirtualNdaniSummaryRow[]> {
    const result = await db.query(
      `${SUMMARY_SELECT}
       WHERE membership.farmer_id = $1
       ORDER BY device.device_code`,
      [farmerId]
    );
    return result.rows.map(normalizeSummary);
  },

  async findForFarmer(
    farmerId: string,
    deviceId: string
  ): Promise<VirtualNdaniSummaryRow | undefined> {
    const result = await db.query(
      `${SUMMARY_SELECT}
       WHERE membership.farmer_id = $1
         AND device.virtual_device_id = $2
       LIMIT 1`,
      [farmerId, deviceId]
    );
    return result.rows[0] ? normalizeSummary(result.rows[0]) : undefined;
  },

  async listChannels(deviceId: string): Promise<any[]> {
    const result = await db.query(
      `
        SELECT
          channel_key,
          display_name,
          pilot_source_policy,
          future_sensor_type,
          future_unit,
          physical_collection_enabled,
          display_order,
          enabled
        FROM virtual_ndani_channels
        WHERE virtual_device_id = $1 AND enabled = TRUE
        ORDER BY display_order
      `,
      [deviceId]
    );
    return result.rows;
  },

  async currentCycle(deviceId: string): Promise<any | undefined> {
    const result = await db.query(
      `
        SELECT *
        FROM virtual_ndani_cycles
        WHERE virtual_device_id = $1
          AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
        ORDER BY scheduled_for DESC
        LIMIT 1
      `,
      [deviceId]
    );
    return result.rows[0] ? normalizeCycle(result.rows[0]) : undefined;
  },

  async findCycle(deviceId: string, cycleId: string): Promise<any | undefined> {
    const result = await db.query(
      `
        SELECT *
        FROM virtual_ndani_cycles
        WHERE virtual_device_id = $1 AND cycle_id = $2
        LIMIT 1
      `,
      [deviceId, cycleId]
    );
    return result.rows[0] ? normalizeCycle(result.rows[0]) : undefined;
  },

  async startCycle(
    deviceId: string,
    farmerId: string,
    mode: CollectionMode
  ): Promise<any> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        `
          SELECT *
          FROM virtual_ndani_cycles
          WHERE virtual_device_id = $1
            AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
          ORDER BY scheduled_for DESC
          LIMIT 1
          FOR UPDATE
        `,
        [deviceId]
      );
      let cycle = existing.rows[0];
      if (cycle) {
        if (cycle.collection_mode && cycle.collection_mode !== mode) {
          throw new Error('cycle_collection_mode_conflict');
        }
        const nextStatus = cycle.status === 'scheduled' ? 'started' : cycle.status;
        const updated = await client.query(
          `
            UPDATE virtual_ndani_cycles
            SET status = $1,
                collection_mode = COALESCE(collection_mode, $2),
                started_at = COALESCE(started_at, EXTRACT(EPOCH FROM NOW())::BIGINT),
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE cycle_id = $3
            RETURNING *
          `,
          [nextStatus, mode, cycle.cycle_id]
        );
        cycle = updated.rows[0];
      } else {
        const inserted = await client.query(
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
              $3,
              $4
            )
            RETURNING *
          `,
          [crypto.randomUUID(), deviceId, mode, `farmer:${farmerId}`]
        );
        cycle = inserted.rows[0];
      }
      await client.query(
        `
          UPDATE virtual_ndani_devices
          SET status = $1, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE virtual_device_id = $2
        `,
        [mode === 'physical_auto' ? 'collecting_physical' : 'collecting_manual', deviceId]
      );
      await insertEvent(client, deviceId, cycle.cycle_id, 'collection_started', 'real', 'complete', {
        collection_mode: mode,
      });
      await client.query('COMMIT');
      return normalizeCycle(cycle);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async timeline(deviceId: string, limit: number): Promise<any[]> {
    const result = await db.query(
      `
        SELECT
          pipeline_event_id,
          cycle_id,
          stage,
          execution_kind,
          status,
          detail_json,
          created_at
        FROM virtual_ndani_pipeline_events
        WHERE virtual_device_id = $1
        ORDER BY created_at DESC, pipeline_event_id DESC
        LIMIT $2
      `,
      [deviceId, limit]
    );
    return result.rows.map((row) => ({
      ...row,
      created_at: Number(row.created_at),
      detail: parseJson(row.detail_json),
      detail_json: undefined,
    }));
  },

  async saveGuidedReading(params: {
    deviceId: string;
    cycleId: string;
    farmerId: string;
    farmId: string;
    reading: ValidatedGuidedReading;
  }): Promise<any> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const cycleResult = await client.query(
        `
          SELECT *
          FROM virtual_ndani_cycles
          WHERE cycle_id = $1 AND virtual_device_id = $2
          FOR UPDATE
        `,
        [params.cycleId, params.deviceId]
      );
      const cycle = cycleResult.rows[0];
      if (!cycle || !['started', 'capturing', 'awaiting_confirmation'].includes(cycle.status)) {
        throw new Error('reading_cycle_not_open');
      }

      const readingId = crypto.randomUUID();
      const readingResult = await client.query(
        `
          INSERT INTO virtual_ndani_readings (
            reading_id,
            virtual_device_id,
            cycle_id,
            farmer_id,
            farm_id,
            collection_mode,
            observed_at,
            quality_status,
            risk_flags_json,
            notes
          )
          VALUES ($1, $2, $3, $4, $5, 'manual_guided', $6, 'awaiting_confirmation', $7, $8)
          ON CONFLICT (cycle_id) DO UPDATE SET
            observed_at = EXCLUDED.observed_at,
            risk_flags_json = EXCLUDED.risk_flags_json,
            notes = EXCLUDED.notes,
            quality_status = 'awaiting_confirmation',
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          RETURNING *
        `,
        [
          readingId,
          params.deviceId,
          params.cycleId,
          params.farmerId,
          params.farmId,
          params.reading.observedAt,
          JSON.stringify(params.reading.riskFlags),
          params.reading.notes ?? null,
        ]
      );
      const savedReading = readingResult.rows[0];

      const fields = readingFields(params.reading);
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
            ON CONFLICT (reading_id, channel_key) DO UPDATE SET
              value_json = EXCLUDED.value_json,
              unit = EXCLUDED.unit,
              measurement_kind = EXCLUDED.measurement_kind,
              source_class = EXCLUDED.source_class,
              source_reference = EXCLUDED.source_reference,
              confidence = EXCLUDED.confidence,
              evidence = EXCLUDED.evidence,
              review_status = 'pending',
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          `,
          [
            crypto.randomUUID(),
            savedReading.reading_id,
            field.channelKey,
            field.value === null ? null : JSON.stringify(field.value),
            field.unit,
            field.measurementKind,
            field.sourceClass,
            field.sourceReference,
            field.confidence,
            field.evidence,
          ]
        );
      }

      await client.query(
        `
          UPDATE virtual_ndani_cycles
          SET status = 'awaiting_confirmation',
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE cycle_id = $1
        `,
        [params.cycleId]
      );
      await insertEvent(
        client,
        params.deviceId,
        params.cycleId,
        'observation_structured',
        'real',
        'awaiting_confirmation',
        {
          reading_id: savedReading.reading_id,
          manual_fields: 5,
          unavailable_hardware_fields: 3,
        }
      );
      await client.query('COMMIT');
      return hydrateReading(savedReading, fields);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getReadingForCycle(deviceId: string, cycleId: string): Promise<any | undefined> {
    const result = await db.query(
      `
        SELECT reading.*
        FROM virtual_ndani_readings reading
        WHERE reading.virtual_device_id = $1 AND reading.cycle_id = $2
        LIMIT 1
      `,
      [deviceId, cycleId]
    );
    if (!result.rows[0]) return undefined;
    return loadReadingFields(result.rows[0]);
  },

  async confirmReading(deviceId: string, cycleId: string): Promise<any> {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          SELECT reading.*
          FROM virtual_ndani_readings reading
          WHERE reading.virtual_device_id = $1
            AND reading.cycle_id = $2
            AND reading.quality_status = 'awaiting_confirmation'
          FOR UPDATE
        `,
        [deviceId, cycleId]
      );
      const reading = result.rows[0];
      if (!reading) throw new Error('reading_not_awaiting_confirmation');
      const riskFlags = parseJson(reading.risk_flags_json) as string[];
      const flagged = riskFlags.length > 0;
      const qualityStatus = flagged ? 'flagged' : 'accepted';
      const cycleStatus = flagged ? 'flagged' : 'accepted';
      const deviceStatus = flagged ? 'needs_coordinator_review' : 'reading_accepted';
      const reviewStatus = flagged ? 'needs_followup' : 'accepted';

      const confirmed = await client.query(
        `
          UPDATE virtual_ndani_readings
          SET quality_status = $1,
              confirmed_at = EXTRACT(EPOCH FROM NOW())::BIGINT,
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE reading_id = $2
          RETURNING *
        `,
        [qualityStatus, reading.reading_id]
      );
      await client.query(
        `
          UPDATE virtual_ndani_reading_fields
          SET review_status = $1,
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE reading_id = $2
        `,
        [reviewStatus, reading.reading_id]
      );
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
        [cycleStatus, cycleId]
      );
      await client.query(
        `
          UPDATE virtual_ndani_devices
          SET status = $1, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE virtual_device_id = $2
        `,
        [deviceStatus, deviceId]
      );
      await insertEvent(client, deviceId, cycleId, 'observation_confirmed', 'real', qualityStatus, {
        reading_id: reading.reading_id,
        risk_flags: riskFlags,
      });
      await insertEvent(client, deviceId, cycleId, 'quality_checks_completed', 'real', qualityStatus, {
        coordinator_review_required: flagged,
      });
      if (flagged) {
        await recordFlaggedReadingContributionHold(client, {
          deviceId,
          cycleId,
          readingId: reading.reading_id,
        });
      } else {
        await prepareAcceptedReadingContribution(client, {
          deviceId,
          cycleId,
          readingId: reading.reading_id,
        });
      }
      await client.query('COMMIT');
      return loadReadingFields(confirmed.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async latestConfirmedReading(deviceId: string): Promise<any | undefined> {
    const result = await db.query(
      `
        SELECT *
        FROM virtual_ndani_readings
        WHERE virtual_device_id = $1
          AND quality_status IN ('accepted', 'flagged')
        ORDER BY confirmed_at DESC
        LIMIT 1
      `,
      [deviceId]
    );
    return result.rows[0] ? loadReadingFields(result.rows[0]) : undefined;
  },

  async latestAvailableFields(deviceId: string): Promise<any[]> {
    const result = await db.query(
      `
        SELECT DISTINCT ON (field.channel_key)
          field.channel_key, field.value_json, field.unit,
          field.measurement_kind, field.source_class,
          field.source_reference, field.confidence, field.evidence,
          field.review_status, reading.observed_at, reading.collection_mode
        FROM virtual_ndani_reading_fields field
        JOIN virtual_ndani_readings reading ON reading.reading_id = field.reading_id
        WHERE reading.virtual_device_id = $1
          AND reading.quality_status IN ('accepted', 'flagged')
          AND field.measurement_kind <> 'unavailable'
        ORDER BY field.channel_key, reading.observed_at DESC, field.created_at DESC
      `,
      [deviceId]
    );
    return result.rows.map((field) => ({
      ...field,
      value: field.value_json === null ? null : parseJson(field.value_json),
      value_json: undefined,
      confidence: field.confidence === null ? null : Number(field.confidence),
      observed_at: Number(field.observed_at),
    }));
  },

  async listContributions(deviceId: string, limit: number): Promise<any[]> {
    const result = await db.query(
      `
        SELECT
          batch.batch_id,
          batch.status,
          batch.execution_kind,
          batch.reading_count,
          batch.eligible_feature_count,
          batch.excluded_feature_count,
          batch.quality_summary_json,
          batch.policy_version,
          batch.opened_at,
          batch.closed_at,
          link.reading_id,
          reading.collection_mode,
          reading.observed_at,
          reading.confirmed_at
        FROM virtual_ndani_batches batch
        JOIN virtual_ndani_batch_readings link ON link.batch_id = batch.batch_id
        JOIN virtual_ndani_readings reading ON reading.reading_id = link.reading_id
        WHERE batch.virtual_device_id = $1
        ORDER BY batch.created_at DESC
        LIMIT $2
      `,
      [deviceId, limit]
    );
    return Promise.all(result.rows.map(async (row) => {
      const [features, stages] = await Promise.all([
        db.query(
          `
            SELECT
              channel_key, feature_key, source_class, measurement_kind,
              confidence, decision, reason, transformation_version, training_run_id
            FROM virtual_ndani_feature_decisions
            WHERE batch_id = $1
            ORDER BY channel_key
          `,
          [row.batch_id]
        ),
        db.query(
          `
            SELECT stage, execution_kind, status, detail_json, created_at
            FROM virtual_ndani_pipeline_events
            WHERE batch_id = $1
            ORDER BY created_at ASC, pipeline_event_id ASC
          `,
          [row.batch_id]
        ),
      ]);
      return {
        ...row,
        reading_count: Number(row.reading_count),
        eligible_feature_count: Number(row.eligible_feature_count),
        excluded_feature_count: Number(row.excluded_feature_count),
        quality_summary: parseJson(row.quality_summary_json),
        quality_summary_json: undefined,
        opened_at: Number(row.opened_at),
        closed_at: row.closed_at === null ? null : Number(row.closed_at),
        observed_at: Number(row.observed_at),
        confirmed_at: row.confirmed_at === null ? null : Number(row.confirmed_at),
        features: features.rows.map((feature) => ({
          ...feature,
          confidence: feature.confidence === null ? null : Number(feature.confidence),
        })),
        stages: stages.rows.map((stage) => ({
          ...stage,
          detail: parseJson(stage.detail_json),
          detail_json: undefined,
          created_at: Number(stage.created_at),
        })),
      };
    }));
  },
};

const SUMMARY_SELECT = `
  SELECT
    device.*,
    farm.display_name AS farm_display_name,
    cycle.cycle_id AS current_cycle_id,
    cycle.status AS current_cycle_status,
    cycle.collection_mode AS current_collection_mode,
    cycle.scheduled_for,
    cycle.due_at
  FROM virtual_ndani_devices device
  JOIN farms farm ON farm.farm_id = device.farm_id
  JOIN farm_memberships membership ON membership.farm_id = farm.farm_id
  LEFT JOIN LATERAL (
    SELECT cycle_id, status, collection_mode, scheduled_for, due_at
    FROM virtual_ndani_cycles
    WHERE virtual_device_id = device.virtual_device_id
      AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
    ORDER BY scheduled_for DESC
    LIMIT 1
  ) cycle ON TRUE
`;

async function ensureDeviceForFarm(farmId: string, siteId: string): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `
        INSERT INTO virtual_ndani_devices (
          virtual_device_id,
          device_code,
          farm_id,
          site_id,
          status,
          activated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          'reading_due',
          EXTRACT(EPOCH FROM NOW())::BIGINT
        )
        ON CONFLICT (farm_id) DO UPDATE SET site_id = EXCLUDED.site_id
        RETURNING virtual_device_id
      `,
      [crypto.randomUUID(), deviceCode(siteId), farmId, siteId]
    );
    const deviceId = inserted.rows[0].virtual_device_id;
    for (let index = 0; index < CHANNELS.length; index += 1) {
      const [key, name, policy, sensor, unit] = CHANNELS[index];
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
        [crypto.randomUUID(), deviceId, key, name, policy, sensor, unit, index + 1]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertEvent(
  client: PoolClient,
  deviceId: string,
  cycleId: string | null,
  stage: string,
  executionKind: string,
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      crypto.randomUUID(),
      deviceId,
      cycleId,
      stage,
      executionKind,
      status,
      JSON.stringify(detail),
    ]
  );
}

function deviceCode(siteId: string): string {
  const suffix = siteId.replace(/^site-/i, '');
  return `NDANI-ODZI-${suffix.toUpperCase()}`;
}

function normalizeSummary(row: any): VirtualNdaniSummaryRow {
  return {
    ...row,
    expected_interval_minutes: Number(row.expected_interval_minutes),
    future_physical_interval_minutes: Number(row.future_physical_interval_minutes),
    provisioned_at: Number(row.provisioned_at),
    activated_at: row.activated_at === null ? null : Number(row.activated_at),
    physical_bound_at: row.physical_bound_at === null
      ? null
      : Number(row.physical_bound_at),
    scheduled_for: row.scheduled_for === null ? null : Number(row.scheduled_for),
    due_at: row.due_at === null ? null : Number(row.due_at),
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function readingFields(reading: ValidatedGuidedReading) {
  const manualFields = Object.entries(reading.values).map(([channelKey, value]) => ({
    channelKey,
    value,
    unit: null,
    measurementKind: 'observed',
    sourceClass: 'manual_proxy',
    sourceReference: 'farmer_guided_form',
    confidence: 1,
    evidence: value,
  }));
  return [
    ...['temperature', 'humidity', 'pressure'].map((channelKey) => ({
      channelKey,
      value: null,
      unit: channelKey === 'temperature' ? 'celsius' : channelKey === 'humidity' ? 'percent' : 'hpa',
      measurementKind: 'unavailable',
      sourceClass: null,
      sourceReference: null,
      confidence: null,
      evidence: null,
    })),
    ...manualFields,
  ];
}

function hydrateReading(reading: any, fields: any[]) {
  return {
    ...normalizeReading(reading),
    fields: fields.map((field) => ({
      channel_key: field.channelKey,
      value: field.value,
      unit: field.unit,
      measurement_kind: field.measurementKind,
      source_class: field.sourceClass,
      source_reference: field.sourceReference,
      confidence: field.confidence,
      evidence: field.evidence,
      review_status: 'pending',
    })),
  };
}

async function loadReadingFields(reading: any) {
  const fields = await db.query(
    `
      SELECT
        channel_key,
        value_json,
        unit,
        measurement_kind,
        source_class,
        source_reference,
        confidence,
        evidence,
        review_status
      FROM virtual_ndani_reading_fields
      WHERE reading_id = $1
      ORDER BY CASE channel_key
        WHEN 'temperature' THEN 1
        WHEN 'humidity' THEN 2
        WHEN 'pressure' THEN 3
        WHEN 'soil_moisture' THEN 4
        WHEN 'rain_condition' THEN 5
        WHEN 'plant_condition' THEN 6
        WHEN 'pest_disease_signs' THEN 7
        WHEN 'irrigation' THEN 8
        ELSE 99
      END
    `,
    [reading.reading_id]
  );
  return {
    ...normalizeReading(reading),
    fields: fields.rows.map((field) => ({
      ...field,
      value: field.value_json === null ? null : parseJson(field.value_json),
      value_json: undefined,
      confidence: field.confidence === null ? null : Number(field.confidence),
    })),
  };
}

function normalizeReading(reading: any) {
  return {
    ...reading,
    observed_at: Number(reading.observed_at),
    recorded_at: Number(reading.recorded_at),
    confirmed_at: reading.confirmed_at === null ? null : Number(reading.confirmed_at),
    risk_flags: parseJson(reading.risk_flags_json),
    risk_flags_json: undefined,
  };
}

function normalizeCycle(cycle: any) {
  return {
    ...cycle,
    scheduled_for: Number(cycle.scheduled_for),
    due_at: Number(cycle.due_at),
    started_at: cycle.started_at === null ? null : Number(cycle.started_at),
    completed_at: cycle.completed_at === null ? null : Number(cycle.completed_at),
    created_at: Number(cycle.created_at),
    updated_at: Number(cycle.updated_at),
  };
}
