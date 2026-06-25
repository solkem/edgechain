import crypto from 'crypto';
import { db } from '../database';

export const MISSED_REASONS = [
  'farmer_unavailable',
  'phone_unavailable',
  'no_connectivity',
  'coordinator_visit_postponed',
  'observation_unsafe_or_impossible',
  'other',
] as const;

export class OperationsError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const operationsService = {
  async ensureSchedules(now = Math.floor(Date.now() / 1000)): Promise<number> {
    const devices = await db.query(
      `
        SELECT *
        FROM virtual_ndani_devices
        WHERE status <> 'suspended'
      `
    );
    let created = 0;
    for (const device of devices.rows) {
      const dueAt = dailyDueAt(now, Number(device.schedule_hour_local));
      const result = await db.query(
        `
          INSERT INTO virtual_ndani_cycles (
            cycle_id,
            virtual_device_id,
            scheduled_for,
            due_at,
            status,
            created_by
          )
          SELECT $1, $2, $3, $3, 'scheduled', 'scheduler'
          WHERE NOT EXISTS (
            SELECT 1
            FROM virtual_ndani_cycles
            WHERE virtual_device_id = $2
              AND due_at >= $4
              AND due_at < $5
          )
            AND NOT EXISTS (
              SELECT 1
              FROM virtual_ndani_cycles
              WHERE virtual_device_id = $2
                AND status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
            )
          RETURNING cycle_id
        `,
        [
          crypto.randomUUID(),
          device.virtual_device_id,
          dueAt,
          startOfDay(now),
          startOfDay(now) + 86400,
        ]
      );
      if (result.rows[0]) {
        created += 1;
        await db.query(
          `
            UPDATE virtual_ndani_devices
            SET status = 'reading_due',
                updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
            WHERE virtual_device_id = $1
              AND status NOT IN ('needs_coordinator_review')
          `,
          [device.virtual_device_id]
        );
        await insertEvent(
          device.virtual_device_id,
          result.rows[0].cycle_id,
          'reading_scheduled',
          'real',
          dueAt <= now ? 'due' : 'scheduled',
          { due_at: dueAt, cadence: 'daily_manual_check' }
        );
      }
    }
    return created;
  },

  async markOverdueMissed(now = Math.floor(Date.now() / 1000)): Promise<number> {
    const result = await db.query(
      `
        UPDATE virtual_ndani_cycles cycle
        SET status = 'missed',
            missed_reason = COALESCE(missed_reason, 'reason_not_recorded'),
            completed_at = $1,
            updated_at = $1
        FROM virtual_ndani_devices device
        WHERE cycle.virtual_device_id = device.virtual_device_id
          AND cycle.status = 'scheduled'
          AND cycle.due_at + (device.grace_minutes * 60) < $1
        RETURNING cycle.cycle_id, cycle.virtual_device_id, cycle.due_at
      `,
      [now]
    );
    for (const cycle of result.rows) {
      await insertEvent(
        cycle.virtual_device_id,
        cycle.cycle_id,
        'reading_missed',
        'real',
        'missed',
        { due_at: Number(cycle.due_at), reason: 'reason_not_recorded' }
      );
    }
    return result.rows.length;
  },

  async run(now = Math.floor(Date.now() / 1000)) {
    const missed = await this.markOverdueMissed(now);
    const scheduled = await this.ensureSchedules(now);
    return { scheduled, missed, processed_at: now };
  },

  async markMissed(params: {
    deviceId: string;
    cycleId: string;
    reason: unknown;
    coordinatorId: string;
  }) {
    const reason = String(params.reason || '');
    if (!(MISSED_REASONS as readonly string[]).includes(reason)) {
      throw new OperationsError('invalid_missed_reason', 400);
    }
    const result = await db.query(
      `
        UPDATE virtual_ndani_cycles
        SET status = 'missed',
            missed_reason = $1,
            completed_at = EXTRACT(EPOCH FROM NOW())::BIGINT,
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        WHERE cycle_id = $2
          AND virtual_device_id = $3
          AND status = 'scheduled'
        RETURNING *
      `,
      [reason, params.cycleId, params.deviceId]
    );
    if (!result.rows[0]) throw new OperationsError('scheduled_cycle_not_found', 404);
    await insertEvent(
      params.deviceId,
      params.cycleId,
      'reading_missed',
      'real',
      'missed',
      { reason, coordinator_id: params.coordinatorId }
    );
    return normalizeCycle(result.rows[0]);
  },

  async recordCoordinatorMinutes(params: {
    readingId: string;
    seconds: unknown;
  }) {
    const seconds = Number(params.seconds);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 8 * 3600) {
      throw new OperationsError('invalid_coordinator_duration', 400);
    }
    const result = await db.query(
      `
        UPDATE virtual_ndani_cycles cycle
        SET coordinator_duration_seconds = $1,
            updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
        FROM virtual_ndani_readings reading
        WHERE reading.reading_id = $2
          AND reading.cycle_id = cycle.cycle_id
        RETURNING cycle.*
      `,
      [seconds, params.readingId]
    );
    if (!result.rows[0]) throw new OperationsError('reading_not_found', 404);
    return normalizeCycle(result.rows[0]);
  },

  async metrics() {
    const result = await db.query(
      `
        WITH cycle_metrics AS (
          SELECT
          COUNT(cycle_id)::int AS total_cycles,
          COUNT(*) FILTER (
            WHERE status IN ('accepted', 'batched', 'flagged')
          )::int AS completed_cycles,
          COUNT(*) FILTER (WHERE status = 'missed')::int AS missed_cycles,
          COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled_cycles,
          COUNT(*) FILTER (
            WHERE status IN ('started', 'capturing', 'awaiting_confirmation')
          )::int AS active_cycles,
          COALESCE(AVG(manual_duration_seconds) FILTER (
            WHERE manual_duration_seconds IS NOT NULL
          ), 0)::float AS average_manual_seconds,
          COALESCE(SUM(manual_duration_seconds), 0)::bigint AS total_manual_seconds,
          COALESCE(SUM(coordinator_duration_seconds), 0)::bigint
            AS total_coordinator_seconds
          FROM virtual_ndani_cycles
        ),
        unavailable_metrics AS (
          SELECT COUNT(*)::bigint AS unavailable_hardware_channel_instances
          FROM virtual_ndani_reading_fields field
          JOIN virtual_ndani_readings reading
            ON reading.reading_id = field.reading_id
          JOIN virtual_ndani_channels channel
            ON channel.virtual_device_id = reading.virtual_device_id
            AND channel.channel_key = field.channel_key
          WHERE reading.quality_status IN ('accepted', 'flagged')
            AND field.measurement_kind = 'unavailable'
            AND channel.future_sensor_type IS NOT NULL
        ),
        device_metrics AS (
          SELECT
            COUNT(*)::int AS devices,
            COALESCE(SUM(
              FLOOR((24 * 60)::numeric / future_physical_interval_minutes)
            ), 0)::bigint AS projected_physical_readings_per_day
          FROM virtual_ndani_devices
        )
        SELECT *
        FROM cycle_metrics
        CROSS JOIN device_metrics
        CROSS JOIN unavailable_metrics
      `
    );
    const row = result.rows[0];
    const totalCycles = Number(row.total_cycles);
    const completedCycles = Number(row.completed_cycles);
    const totalManualSeconds = Number(row.total_manual_seconds);
    const projectedPhysical = Number(row.projected_physical_readings_per_day);
    return {
      devices: Number(row.devices),
      total_cycles: totalCycles,
      completed_cycles: completedCycles,
      missed_cycles: Number(row.missed_cycles),
      scheduled_cycles: Number(row.scheduled_cycles),
      active_cycles: Number(row.active_cycles),
      completion_rate: totalCycles === 0 ? 0 : completedCycles / totalCycles,
      average_manual_minutes: Number(row.average_manual_seconds) / 60,
      total_manual_hours: totalManualSeconds / 3600,
      total_coordinator_hours: Number(row.total_coordinator_seconds) / 3600,
      projected_physical_readings_per_day: projectedPhysical,
      projected_temporal_coverage_multiplier:
        completedCycles === 0 ? projectedPhysical : projectedPhysical / completedCycles,
      unavailable_hardware_channel_instances:
        Number(row.unavailable_hardware_channel_instances),
    };
  },

  async deviceStatus(deviceId: string) {
    const result = await db.query(
      `
        SELECT
          COUNT(*)::int AS total_cycles,
          COUNT(*) FILTER (
            WHERE status IN ('accepted', 'batched', 'flagged')
          )::int AS completed_cycles,
          COUNT(*) FILTER (WHERE status = 'missed')::int AS missed_cycles,
          COALESCE(AVG(manual_duration_seconds) FILTER (
            WHERE manual_duration_seconds IS NOT NULL
          ), 0)::float AS average_manual_seconds,
          MAX(due_at) FILTER (
            WHERE status IN ('scheduled', 'started', 'capturing', 'awaiting_confirmation')
          ) AS current_due_at,
          MAX(completed_at) FILTER (WHERE status = 'missed') AS last_missed_at
        FROM virtual_ndani_cycles
        WHERE virtual_device_id = $1
      `,
      [deviceId]
    );
    const row = result.rows[0];
    const total = Number(row.total_cycles);
    const completed = Number(row.completed_cycles);
    return {
      total_cycles: total,
      completed_cycles: completed,
      missed_cycles: Number(row.missed_cycles),
      completion_rate: total === 0 ? 0 : completed / total,
      average_manual_minutes: Number(row.average_manual_seconds) / 60,
      current_due_at: row.current_due_at === null ? null : Number(row.current_due_at),
      last_missed_at: row.last_missed_at === null ? null : Number(row.last_missed_at),
    };
  },
};

function dailyDueAt(now: number, hour: number): number {
  return startOfDay(now) + hour * 3600;
}

function startOfDay(epoch: number): number {
  // Africa/Harare is UTC+02:00 year-round.
  const harareOffsetSeconds = 2 * 3600;
  const date = new Date((epoch + harareOffsetSeconds) * 1000);
  return Math.floor(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ) / 1000) - harareOffsetSeconds;
}

async function insertEvent(
  deviceId: string,
  cycleId: string,
  stage: string,
  executionKind: string,
  status: string,
  detail: Record<string, unknown>
) {
  await db.query(
    `
      INSERT INTO virtual_ndani_pipeline_events (
        pipeline_event_id, virtual_device_id, cycle_id,
        stage, execution_kind, status, detail_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      crypto.randomUUID(), deviceId, cycleId, stage,
      executionKind, status, JSON.stringify(detail),
    ]
  );
}

function normalizeCycle(row: any) {
  return {
    ...row,
    scheduled_for: Number(row.scheduled_for),
    due_at: Number(row.due_at),
    started_at: row.started_at === null ? null : Number(row.started_at),
    completed_at: row.completed_at === null ? null : Number(row.completed_at),
  };
}
