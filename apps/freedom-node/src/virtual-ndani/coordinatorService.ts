import crypto from 'crypto';
import { db } from '../database';
import { prepareAcceptedReadingContribution } from './contributionPipeline';
import { operationsService } from './operationsService';
import { evidenceService } from './evidenceService';
import { physicalBindingService } from './physicalBindingService';

export class CoordinatorError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const coordinatorService = {
  async fleet() {
    if (process.env.VIRTUAL_NDANI_SCHEDULING_ENABLED !== 'false') {
      await operationsService.run();
    }
    const result = await db.query(
      `
        SELECT
          device.virtual_device_id,
          device.device_code,
          device.site_id,
          device.mode,
          device.status,
          device.future_physical_interval_minutes,
          device.physical_device_pubkey,
          device.physical_bound_at,
          device.physical_binding_version,
          farm.farm_id,
          farm.display_name AS farm_display_name,
          farmer.display_name AS farmer_display_name,
          latest.reading_id AS latest_reading_id,
          latest.quality_status AS latest_quality_status,
          latest.collection_mode AS latest_collection_mode,
          latest.observed_at AS latest_observed_at,
          COALESCE(flagged.flagged_count, 0)::int AS flagged_reading_count,
          COALESCE(contributions.contribution_count, 0)::int AS contribution_count
          , current_cycle.cycle_id AS current_cycle_id
          , current_cycle.status AS current_cycle_status
          , current_cycle.due_at AS current_due_at
          , COALESCE(cycles.missed_count, 0)::int AS missed_cycle_count
          , COALESCE(cycles.average_manual_seconds, 0)::float
            AS average_manual_seconds
        FROM virtual_ndani_devices device
        JOIN farms farm ON farm.farm_id = device.farm_id
        LEFT JOIN LATERAL (
          SELECT member.display_name
          FROM farm_memberships membership
          JOIN farmers member ON member.farmer_id = membership.farmer_id
          WHERE membership.farm_id = farm.farm_id
            AND membership.role = 'owner'
          ORDER BY membership.valid_from
          LIMIT 1
        ) farmer ON TRUE
        LEFT JOIN LATERAL (
          SELECT reading_id, quality_status, collection_mode, observed_at
          FROM virtual_ndani_readings
          WHERE virtual_device_id = device.virtual_device_id
          ORDER BY observed_at DESC
          LIMIT 1
        ) latest ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS flagged_count
          FROM virtual_ndani_readings
          WHERE virtual_device_id = device.virtual_device_id
            AND quality_status = 'flagged'
        ) flagged ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS contribution_count
          FROM virtual_ndani_batches
          WHERE virtual_device_id = device.virtual_device_id
            AND status = 'model_ready'
        ) contributions ON TRUE
        LEFT JOIN LATERAL (
          SELECT cycle_id, status, due_at
          FROM virtual_ndani_cycles
          WHERE virtual_device_id = device.virtual_device_id
            AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
          ORDER BY due_at DESC
          LIMIT 1
        ) current_cycle ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE status = 'missed') AS missed_count,
            AVG(manual_duration_seconds) FILTER (
              WHERE manual_duration_seconds IS NOT NULL
            ) AS average_manual_seconds
          FROM virtual_ndani_cycles
          WHERE virtual_device_id = device.virtual_device_id
        ) cycles ON TRUE
        ORDER BY
          CASE WHEN device.status = 'needs_coordinator_review' THEN 0 ELSE 1 END,
          device.device_code
      `
    );
    return result.rows.map((row) => ({
      ...row,
      future_physical_interval_minutes: Number(row.future_physical_interval_minutes),
      latest_observed_at: row.latest_observed_at === null
        ? null
        : Number(row.latest_observed_at),
      flagged_reading_count: Number(row.flagged_reading_count),
      contribution_count: Number(row.contribution_count),
      current_due_at: row.current_due_at === null ? null : Number(row.current_due_at),
      missed_cycle_count: Number(row.missed_cycle_count),
      average_manual_minutes: Number(row.average_manual_seconds) / 60,
      physical_bound_at: row.physical_bound_at === null
        ? null
        : Number(row.physical_bound_at),
    }));
  },

  async pendingReviews() {
    const result = await db.query(
      `
        SELECT
          reading.*,
          device.device_code,
          device.site_id,
          farm.display_name AS farm_display_name,
          farmer.display_name AS farmer_display_name
        FROM virtual_ndani_readings reading
        JOIN virtual_ndani_devices device
          ON device.virtual_device_id = reading.virtual_device_id
        JOIN farms farm ON farm.farm_id = reading.farm_id
        LEFT JOIN farmers farmer ON farmer.farmer_id = reading.farmer_id
        WHERE reading.quality_status = 'flagged'
          AND NOT EXISTS (
            SELECT 1
            FROM virtual_ndani_reading_reviews review
            WHERE review.reading_id = reading.reading_id
          )
        ORDER BY reading.confirmed_at ASC
      `
    );
    return Promise.all(result.rows.map(async (row) => {
      const fields = await db.query(
        `
          SELECT
            channel_key, value_json, unit, measurement_kind, source_class,
            source_reference, confidence, evidence, review_status
          FROM virtual_ndani_reading_fields
          WHERE reading_id = $1
          ORDER BY channel_key
        `,
        [row.reading_id]
      );
      return {
        ...normalizeReading(row),
        fields: fields.rows.map((field) => ({
          ...field,
          value: field.value_json === null ? null : parseJson(field.value_json),
          value_json: undefined,
          confidence: field.confidence === null ? null : Number(field.confidence),
        })),
      };
    }));
  },

  async review(params: {
    readingId: string;
    coordinatorId: string;
    decision: unknown;
    reason: unknown;
    coordinatorDurationSeconds?: unknown;
  }) {
    const decision = String(params.decision || '');
    if (!['approved', 'excluded'].includes(decision)) {
      throw new CoordinatorError('invalid_review_decision', 400);
    }
    const reason = String(params.reason || '').trim();
    if (reason.length < 5 || reason.length > 500) {
      throw new CoordinatorError('review_reason_must_contain_5_to_500_characters', 400);
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT * FROM virtual_ndani_reading_reviews WHERE reading_id = $1',
        [params.readingId]
      );
      if (existing.rows[0]) {
        if (existing.rows[0].decision !== decision) {
          throw new CoordinatorError('reading_already_reviewed', 409);
        }
        await client.query('COMMIT');
        return existing.rows[0];
      }

      const result = await client.query(
        `
          SELECT *
          FROM virtual_ndani_readings
          WHERE reading_id = $1
          FOR UPDATE
        `,
        [params.readingId]
      );
      const reading = result.rows[0];
      if (!reading) throw new CoordinatorError('reading_not_found', 404);
      if (reading.quality_status !== 'flagged') {
        throw new CoordinatorError('reading_not_pending_review', 409);
      }

      const approved = decision === 'approved';
      const resultingStatus = approved ? 'accepted' : 'excluded';
      const reviewId = crypto.randomUUID();
      await client.query(
        `
          INSERT INTO virtual_ndani_reading_reviews (
            review_id, reading_id, coordinator_id, decision, reason,
            previous_quality_status, resulting_quality_status
          )
          VALUES ($1, $2, $3, $4, $5, 'flagged', $6)
        `,
        [
          reviewId,
          reading.reading_id,
          params.coordinatorId,
          decision,
          reason,
          resultingStatus,
        ]
      );
      await client.query(
        `
          UPDATE virtual_ndani_readings
          SET quality_status = $1,
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE reading_id = $2
        `,
        [resultingStatus, reading.reading_id]
      );
      await client.query(
        `
          UPDATE virtual_ndani_reading_fields
          SET review_status = $1,
              updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
          WHERE reading_id = $2
        `,
        [approved ? 'accepted' : 'needs_followup', reading.reading_id]
      );
      const coordinatorSeconds = Number(params.coordinatorDurationSeconds);
      if (
        Number.isInteger(coordinatorSeconds)
        && coordinatorSeconds >= 0
        && coordinatorSeconds <= 8 * 3600
      ) {
        await client.query(
          `
            UPDATE virtual_ndani_cycles
            SET coordinator_duration_seconds = $1,
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE cycle_id = $2
          `,
          [coordinatorSeconds, reading.cycle_id]
        );
      }

      if (approved) {
        await client.query(
          `
            INSERT INTO virtual_ndani_pipeline_events (
              pipeline_event_id, virtual_device_id, cycle_id, reading_id,
              stage, execution_kind, status, detail_json
            )
            VALUES ($1, $2, $3, $4, 'coordinator_review', 'real', 'approved', $5)
          `,
          [
            crypto.randomUUID(),
            reading.virtual_device_id,
            reading.cycle_id,
            reading.reading_id,
            JSON.stringify({ coordinator_id: params.coordinatorId, reason }),
          ]
        );
        await prepareAcceptedReadingContribution(client, {
          deviceId: reading.virtual_device_id,
          cycleId: reading.cycle_id,
          readingId: reading.reading_id,
        });
      } else {
        await client.query(
          `
            UPDATE virtual_ndani_cycles
            SET status = 'cancelled',
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE cycle_id = $1
          `,
          [reading.cycle_id]
        );
        await client.query(
          `
            UPDATE virtual_ndani_devices
            SET status = 'reading_due',
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE virtual_device_id = $1
          `,
          [reading.virtual_device_id]
        );
        await client.query(
          `
            INSERT INTO virtual_ndani_pipeline_events (
              pipeline_event_id, virtual_device_id, cycle_id, reading_id,
              stage, execution_kind, status, detail_json
            )
            VALUES ($1, $2, $3, $4, 'coordinator_review', 'real', 'excluded', $5)
          `,
          [
            crypto.randomUUID(),
            reading.virtual_device_id,
            reading.cycle_id,
            reading.reading_id,
            JSON.stringify({ coordinator_id: params.coordinatorId, reason }),
          ]
        );
        await client.query(
          `
            INSERT INTO virtual_ndani_pipeline_events (
              pipeline_event_id, virtual_device_id, cycle_id, reading_id,
              stage, execution_kind, status, detail_json
            )
            VALUES ($1, $2, $3, $4, 'model_readiness_updated', 'real', 'excluded', $5)
          `,
          [
            crypto.randomUUID(),
            reading.virtual_device_id,
            reading.cycle_id,
            reading.reading_id,
            JSON.stringify({ reason, eligible_for_research_dataset: false }),
          ]
        );
      }
      await client.query('COMMIT');
      return {
        review_id: reviewId,
        reading_id: reading.reading_id,
        decision,
        reason,
        resulting_quality_status: resultingStatus,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async operationsRun() {
    if (process.env.VIRTUAL_NDANI_SCHEDULING_ENABLED === 'false') {
      throw new CoordinatorError('scheduling_disabled', 409);
    }
    return operationsService.run();
  },

  async metrics() {
    return operationsService.metrics();
  },

  async evidenceReport() {
    return evidenceService.report();
  },

  async evidenceCsv() {
    return evidenceService.csv();
  },

  async issuePhysicalBindingChallenge(params: {
    deviceId: string;
    devicePubkey: unknown;
    coordinatorId: string;
  }) {
    return physicalBindingService.issueChallenge(params);
  },

  async verifyPhysicalBinding(params: {
    deviceId: string;
    challengeId: unknown;
    signature: unknown;
    coordinatorId: string;
  }) {
    return physicalBindingService.verify(params);
  },

  async markMissed(params: {
    deviceId: string;
    cycleId: string;
    reason: unknown;
    coordinatorId: string;
  }) {
    return operationsService.markMissed(params);
  },
};

function normalizeReading(row: any) {
  return {
    ...row,
    observed_at: Number(row.observed_at),
    recorded_at: Number(row.recorded_at),
    confirmed_at: row.confirmed_at === null ? null : Number(row.confirmed_at),
    risk_flags: parseJson(row.risk_flags_json),
    risk_flags_json: undefined,
    context: parseJson(row.context_json),
    context_json: undefined,
  };
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
