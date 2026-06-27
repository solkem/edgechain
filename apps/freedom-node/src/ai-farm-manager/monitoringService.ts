import { db } from '../database';

export interface AiFarmManagerMonitoringReport {
  report_version: 'ai-farm-manager-monitoring-v1';
  generated_at: number;
  summary: {
    ai_profiles_completed: number;
    weekly_checkins_completed: number;
    ai_plans_generated: number;
    coordinator_reviews_required: number;
    recommendations_followed: number;
    prompt_invocations: number;
    total_estimated_cost_usd: number;
    average_cost_per_farmer_usd: number;
    fallback_rate: number;
    validation_failure_rate: number;
  };
  prompt_families: Array<{
    prompt_family: string;
    prompt_version: string;
    invocations: number;
    success: number;
    fallback: number;
    validation_failed: number;
    errors: number;
    estimated_cost_usd: number;
  }>;
  common_pain_points: Array<{
    pain_point: string;
    farmers: number;
  }>;
  recent_failures: Array<{
    prompt_family: string;
    prompt_version: string;
    model_provider: string;
    model_name: string;
    status: string;
    error_code: string | null;
    created_at: number;
  }>;
}

export const aiFarmManagerMonitoringService = {
  async report(): Promise<AiFarmManagerMonitoringReport> {
    const [
      summaryResult,
      promptFamilyResult,
      painPointResult,
      recentFailuresResult,
    ] = await Promise.all([
      db.query(`
        WITH invocation_metrics AS (
          SELECT
            COUNT(*)::int AS prompt_invocations,
            COUNT(DISTINCT farmer_id)::int AS farmers_with_invocations,
            COALESCE(SUM(estimated_cost_usd), 0)::float AS total_estimated_cost_usd,
            COALESCE(AVG(CASE WHEN status = 'fallback' THEN 1.0 ELSE 0.0 END), 0)::float AS fallback_rate,
            COALESCE(AVG(CASE WHEN status = 'validation_failed' THEN 1.0 ELSE 0.0 END), 0)::float AS validation_failure_rate
          FROM ai_prompt_invocations
        )
        SELECT
          (SELECT COUNT(*)::int FROM farmer_ai_profiles WHERE status IN ('active', 'needs_update')) AS ai_profiles_completed,
          (SELECT COUNT(*)::int FROM weekly_farm_checkins) AS weekly_checkins_completed,
          (SELECT COUNT(*)::int FROM ai_farm_plans) AS ai_plans_generated,
          (SELECT COUNT(*)::int FROM ai_farm_plans WHERE coordinator_review_required = TRUE) AS coordinator_reviews_required,
          (SELECT COUNT(*)::int FROM ai_recommendation_outcomes WHERE farmer_followed = TRUE) AS recommendations_followed,
          invocation_metrics.*
        FROM invocation_metrics
      `),
      db.query(`
        SELECT
          prompt_family,
          prompt_version,
          COUNT(*)::int AS invocations,
          COUNT(*) FILTER (WHERE status = 'success')::int AS success,
          COUNT(*) FILTER (WHERE status = 'fallback')::int AS fallback,
          COUNT(*) FILTER (WHERE status = 'validation_failed')::int AS validation_failed,
          COUNT(*) FILTER (WHERE status = 'error')::int AS errors,
          COALESCE(SUM(estimated_cost_usd), 0)::float AS estimated_cost_usd
        FROM ai_prompt_invocations
        GROUP BY prompt_family, prompt_version
        ORDER BY invocations DESC, prompt_family
      `),
      db.query(`
        SELECT primary_pain_point AS pain_point, COUNT(*)::int AS farmers
        FROM farmer_ai_profiles
        WHERE primary_pain_point IS NOT NULL
          AND LENGTH(TRIM(primary_pain_point)) > 0
          AND status IN ('active', 'needs_update', 'draft')
        GROUP BY primary_pain_point
        ORDER BY farmers DESC, primary_pain_point
        LIMIT 8
      `),
      db.query(`
        SELECT
          prompt_family,
          prompt_version,
          model_provider,
          model_name,
          status,
          error_code,
          created_at
        FROM ai_prompt_invocations
        WHERE status IN ('validation_failed', 'fallback', 'error')
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);
    const row = summaryResult.rows[0] ?? {};
    const promptInvocations = Number(row.prompt_invocations ?? 0);
    const farmersWithInvocations = Number(row.farmers_with_invocations ?? 0);
    const totalCost = Number(row.total_estimated_cost_usd ?? 0);
    return {
      report_version: 'ai-farm-manager-monitoring-v1',
      generated_at: Math.floor(Date.now() / 1000),
      summary: {
        ai_profiles_completed: Number(row.ai_profiles_completed ?? 0),
        weekly_checkins_completed: Number(row.weekly_checkins_completed ?? 0),
        ai_plans_generated: Number(row.ai_plans_generated ?? 0),
        coordinator_reviews_required: Number(row.coordinator_reviews_required ?? 0),
        recommendations_followed: Number(row.recommendations_followed ?? 0),
        prompt_invocations: promptInvocations,
        total_estimated_cost_usd: totalCost,
        average_cost_per_farmer_usd:
          farmersWithInvocations > 0 ? totalCost / farmersWithInvocations : 0,
        fallback_rate: Number(row.fallback_rate ?? 0),
        validation_failure_rate: Number(row.validation_failure_rate ?? 0),
      },
      prompt_families: promptFamilyResult.rows.map((family) => ({
        prompt_family: family.prompt_family,
        prompt_version: family.prompt_version,
        invocations: Number(family.invocations ?? 0),
        success: Number(family.success ?? 0),
        fallback: Number(family.fallback ?? 0),
        validation_failed: Number(family.validation_failed ?? 0),
        errors: Number(family.errors ?? 0),
        estimated_cost_usd: Number(family.estimated_cost_usd ?? 0),
      })),
      common_pain_points: painPointResult.rows.map((painPoint) => ({
        pain_point: painPoint.pain_point,
        farmers: Number(painPoint.farmers ?? 0),
      })),
      recent_failures: recentFailuresResult.rows.map((failure) => ({
        prompt_family: failure.prompt_family,
        prompt_version: failure.prompt_version,
        model_provider: failure.model_provider,
        model_name: failure.model_name,
        status: failure.status,
        error_code: failure.error_code,
        created_at: Number(failure.created_at),
      })),
    };
  },
};
