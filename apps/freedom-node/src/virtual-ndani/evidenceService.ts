import { db } from '../database';
import { operationsService } from './operationsService';

export const evidenceService = {
  async report() {
    const [summary, fleetResult, channelResult, researchResult] = await Promise.all([
      operationsService.metrics(),
      db.query(
        `
          SELECT
            device.device_code,
            device.site_id,
            device.mode,
            device.future_physical_interval_minutes,
            COUNT(cycle.cycle_id)::int AS total_cycles,
            COUNT(cycle.cycle_id) FILTER (
              WHERE cycle.status IN ('accepted', 'batched', 'flagged')
            )::int AS completed_cycles,
            COUNT(cycle.cycle_id) FILTER (
              WHERE cycle.status = 'missed'
            )::int AS missed_cycles,
            COALESCE(AVG(cycle.manual_duration_seconds) FILTER (
              WHERE cycle.manual_duration_seconds IS NOT NULL
            ), 0)::float AS average_manual_seconds,
            COALESCE(SUM(cycle.manual_duration_seconds), 0)::bigint
              AS total_manual_seconds,
            COALESCE(SUM(cycle.coordinator_duration_seconds), 0)::bigint
              AS total_coordinator_seconds,
            FLOOR((24 * 60)::numeric / device.future_physical_interval_minutes)::int
              AS projected_physical_readings_per_day
          FROM virtual_ndani_devices device
          LEFT JOIN virtual_ndani_cycles cycle
            ON cycle.virtual_device_id = device.virtual_device_id
          GROUP BY
            device.virtual_device_id,
            device.device_code,
            device.site_id,
            device.mode,
            device.future_physical_interval_minutes
          ORDER BY device.device_code
        `
      ),
      db.query(
        `
          SELECT
            field.channel_key,
            COUNT(*)::int AS field_count,
            COUNT(*) FILTER (
              WHERE field.measurement_kind = 'unavailable'
            )::int AS unavailable_count,
            COUNT(*) FILTER (
              WHERE field.measurement_kind = 'observed'
            )::int AS observed_count,
            COUNT(*) FILTER (
              WHERE field.measurement_kind = 'measured'
            )::int AS measured_count,
            COUNT(*) FILTER (
              WHERE field.source_class = 'manual_proxy'
            )::int AS manual_proxy_count,
            COUNT(*) FILTER (
              WHERE field.source_class = 'physical_sensor'
            )::int AS physical_sensor_count,
            COUNT(*) FILTER (
              WHERE field.source_class = 'external_context'
            )::int AS external_context_count,
            COUNT(*) FILTER (
              WHERE field.source_class = 'derived'
            )::int AS derived_count
          FROM virtual_ndani_reading_fields field
          JOIN virtual_ndani_readings reading
            ON reading.reading_id = field.reading_id
          WHERE reading.quality_status <> 'cancelled'
          GROUP BY field.channel_key
          ORDER BY field.channel_key
        `
      ),
      db.query(
        `
          SELECT
            COUNT(DISTINCT reading.reading_id) FILTER (
              WHERE reading.quality_status = 'accepted'
            )::int AS accepted_readings,
            COUNT(DISTINCT reading.reading_id) FILTER (
              WHERE reading.quality_status = 'flagged'
            )::int AS flagged_readings,
            COUNT(DISTINCT reading.reading_id) FILTER (
              WHERE reading.quality_status = 'excluded'
            )::int AS excluded_readings,
            COUNT(DISTINCT batch.batch_id) FILTER (
              WHERE batch.status = 'model_ready'
            )::int AS model_ready_batches,
            COUNT(decision.feature_decision_id) FILTER (
              WHERE decision.decision = 'eligible'
            )::int AS eligible_features,
            COUNT(decision.feature_decision_id) FILTER (
              WHERE decision.decision = 'excluded'
            )::int AS excluded_features,
            COUNT(decision.feature_decision_id) FILTER (
              WHERE decision.training_run_id IS NOT NULL
            )::int AS features_used_in_training,
            COUNT(DISTINCT event.pipeline_event_id) FILTER (
              WHERE event.stage = 'manual_reading_proof'
                AND event.execution_kind = 'not_applicable'
            )::int AS manual_readings_without_device_proof
          FROM virtual_ndani_readings reading
          LEFT JOIN virtual_ndani_batch_readings link
            ON link.reading_id = reading.reading_id
          LEFT JOIN virtual_ndani_batches batch
            ON batch.batch_id = link.batch_id
          LEFT JOIN virtual_ndani_feature_decisions decision
            ON decision.batch_id = batch.batch_id
          LEFT JOIN virtual_ndani_pipeline_events event
            ON event.reading_id = reading.reading_id
            AND event.stage = 'manual_reading_proof'
        `
      ),
    ]);

    const fleet = fleetResult.rows.map((row) => {
      const totalCycles = Number(row.total_cycles);
      const completedCycles = Number(row.completed_cycles);
      const projected = Number(row.projected_physical_readings_per_day);
      return {
        device_code: row.device_code,
        site_id: row.site_id,
        mode: row.mode,
        total_cycles: totalCycles,
        completed_cycles: completedCycles,
        missed_cycles: Number(row.missed_cycles),
        completion_rate: totalCycles === 0 ? 0 : completedCycles / totalCycles,
        average_manual_minutes: Number(row.average_manual_seconds) / 60,
        total_manual_hours: Number(row.total_manual_seconds) / 3600,
        total_coordinator_hours: Number(row.total_coordinator_seconds) / 3600,
        projected_physical_readings_per_day: projected,
        projected_temporal_coverage_multiplier:
          completedCycles === 0 ? projected : projected / completedCycles,
      };
    });
    const research = researchResult.rows[0] || {};

    return {
      report_version: 'virtual-ndani-accelerator-evidence-v1',
      generated_at: Math.floor(Date.now() / 1000),
      scope: 'Odzi human-assisted Virtual Ndani Kit pilot',
      truth_statement:
        'Manual observations are reported separately from physical measurements. '
        + 'Projected automation values are estimates; model-ready records have not '
        + 'necessarily trained a model.',
      methodology: {
        pilot_manual_cadence: 'one scheduled human-assisted check per day',
        physical_projection:
          '24 hours divided by each device future_physical_interval_minutes',
        identity_policy: 'site and device identifiers only; farmer names excluded',
        synthetic_demo_records_included: false,
      },
      summary,
      fleet,
      channels: channelResult.rows.map((row) => ({
        channel_key: row.channel_key,
        field_count: Number(row.field_count),
        unavailable_count: Number(row.unavailable_count),
        observed_count: Number(row.observed_count),
        measured_count: Number(row.measured_count),
        manual_proxy_count: Number(row.manual_proxy_count),
        physical_sensor_count: Number(row.physical_sensor_count),
        external_context_count: Number(row.external_context_count),
        derived_count: Number(row.derived_count),
      })),
      research: {
        accepted_readings: Number(research.accepted_readings),
        flagged_readings: Number(research.flagged_readings),
        excluded_readings: Number(research.excluded_readings),
        model_ready_batches: Number(research.model_ready_batches),
        eligible_features: Number(research.eligible_features),
        excluded_features: Number(research.excluded_features),
        features_used_in_training: Number(research.features_used_in_training),
        manual_readings_without_device_proof:
          Number(research.manual_readings_without_device_proof),
        model_training_completed: Number(research.features_used_in_training) > 0,
      },
    };
  },

  async csv() {
    const report = await this.report();
    const headers = [
      'device_code',
      'site_id',
      'mode',
      'total_cycles',
      'completed_cycles',
      'missed_cycles',
      'completion_rate_percent',
      'average_manual_minutes',
      'total_manual_hours',
      'total_coordinator_hours',
      'projected_physical_readings_per_day',
      'projected_temporal_coverage_multiplier',
    ];
    const rows = report.fleet.map((device) => [
      device.device_code,
      device.site_id,
      device.mode,
      device.total_cycles,
      device.completed_cycles,
      device.missed_cycles,
      (device.completion_rate * 100).toFixed(2),
      device.average_manual_minutes.toFixed(2),
      device.total_manual_hours.toFixed(2),
      device.total_coordinator_hours.toFixed(2),
      device.projected_physical_readings_per_day,
      device.projected_temporal_coverage_multiplier.toFixed(2),
    ]);
    return [headers, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
  },
};

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
