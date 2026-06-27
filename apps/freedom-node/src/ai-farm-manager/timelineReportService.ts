import { authRepository, FarmerFarm } from '../auth/authRepository';
import { virtualNdaniService } from '../virtual-ndani/service';
import {
  AiFarmPlan,
  AiRecommendationOutcome,
  FarmerAiProfile,
  WeeklyFarmCheckin,
} from './domain';
import { aiFarmManagerRepository } from './repository';

export type FarmerTimelineEventType =
  | 'profile'
  | 'checkin'
  | 'plan'
  | 'outcome'
  | 'ndani_kit';

export interface FarmerTimelineEvent {
  event_id: string;
  event_type: FarmerTimelineEventType;
  occurred_at: number;
  title: string;
  summary: string;
  risk_level: 'low' | 'medium' | 'high' | null;
  source_id: string;
}

export interface FarmerAiReport {
  report_version: 'farmer-ai-report-v1';
  generated_at: number;
  farmer_id: string;
  farm: {
    farm_id: string;
    name: string;
    site_id: string;
  };
  profile: {
    current_crop: string | null;
    current_crop_stage: string | null;
    main_crops: string[];
    primary_goal: string | null;
    primary_pain_point: string | null;
    water_access: string | null;
    irrigation_method: string | null;
    soil_type: string | null;
    ai_manager_brief: string | null;
  } | null;
  summary: {
    checkins: number;
    plans: number;
    outcomes: number;
    high_risk_weeks: number;
    latest_risk_level: 'low' | 'medium' | 'high' | null;
    coordinator_reviews_recommended: number;
    virtual_ndani_devices: number;
  };
  crop_journey: string[];
  weekly_observation_summary: string[];
  advice_summary: string[];
  follow_up_questions: string[];
  lessons_learned: string[];
  next_season_recommendations: string[];
  physical_ndani_kit_readiness: string;
  privacy_and_control_statement: string;
}

export class FarmerTimelineReportError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const farmerTimelineReportService = {
  async timeline(input: {
    farmerId: string;
    farmId?: unknown;
  }): Promise<FarmerTimelineEvent[]> {
    const context = await loadContext(input.farmerId, input.farmId);
    return buildTimeline(context);
  },

  async report(input: {
    farmerId: string;
    farmId?: unknown;
  }): Promise<FarmerAiReport> {
    const context = await loadContext(input.farmerId, input.farmId);
    return buildReport(context);
  },
};

async function loadContext(farmerId: string, requestedFarmId: unknown) {
  const farm = await resolveFarm(farmerId, requestedFarmId);
  const [profile, checkins, plans, outcomes, devices] = await Promise.all([
    aiFarmManagerRepository.getActiveProfile({
      farmerId,
      farmId: farm.farm_id,
    }),
    aiFarmManagerRepository.listCheckins({
      farmerId,
      farmId: farm.farm_id,
      limit: 52,
    }),
    aiFarmManagerRepository.listPlans({
      farmerId,
      farmId: farm.farm_id,
      limit: 52,
    }),
    aiFarmManagerRepository.listOutcomesForFarmer({
      farmerId,
      limit: 52,
    }),
    virtualNdaniService.list(farmerId),
  ]);
  return {
    farmerId,
    farm,
    profile: profile ?? null,
    checkins,
    plans,
    outcomes,
    devices: devices.filter((device) => device.farm_id === farm.farm_id),
  };
}

async function resolveFarm(farmerId: string, requestedFarmId: unknown): Promise<FarmerFarm> {
  const farms = await authRepository.listFarms(farmerId);
  if (farms.length === 0) {
    throw new FarmerTimelineReportError('farm_not_found', 404);
  }
  const farmId = typeof requestedFarmId === 'string' ? requestedFarmId.trim() : '';
  if (!farmId) return farms[0];
  const farm = farms.find((candidate) => candidate.farm_id === farmId);
  if (!farm) throw new FarmerTimelineReportError('farm_not_found', 404);
  return farm;
}

function buildTimeline(context: {
  farm: FarmerFarm;
  profile: FarmerAiProfile | null;
  checkins: WeeklyFarmCheckin[];
  plans: AiFarmPlan[];
  outcomes: AiRecommendationOutcome[];
  devices: any[];
}): FarmerTimelineEvent[] {
  const events: FarmerTimelineEvent[] = [];
  if (context.profile) {
    events.push({
      event_id: `profile-${context.profile.profile_id}`,
      event_type: 'profile',
      occurred_at: context.profile.updated_at,
      title: 'AI Farm Manager profile updated',
      summary: context.profile.ai_manager_brief
        || context.profile.farm_story_summary
        || 'Farmer profile captured for personalization.',
      risk_level: null,
      source_id: context.profile.profile_id,
    });
  }
  for (const checkin of context.checkins) {
    events.push({
      event_id: `checkin-${checkin.checkin_id}`,
      event_type: 'checkin',
      occurred_at: checkin.created_at,
      title: `Weekly check-in: ${checkin.crop || context.profile?.current_crop || 'crop not named'}`,
      summary: `Soil ${pretty(checkin.soil_condition)}, plants ${pretty(checkin.plant_condition)}, pests ${pretty(checkin.pest_disease_signs)}. ${checkin.farmer_biggest_worry || ''}`.trim(),
      risk_level: checkin.risk_level,
      source_id: checkin.checkin_id,
    });
  }
  for (const plan of context.plans) {
    events.push({
      event_id: `plan-${plan.plan_id}`,
      event_type: 'plan',
      occurred_at: plan.created_at,
      title: `AI plan: ${plan.main_issue || 'weekly farm guidance'}`,
      summary: plan.summary,
      risk_level: plan.risk_level,
      source_id: plan.plan_id,
    });
  }
  for (const outcome of context.outcomes) {
    events.push({
      event_id: `outcome-${outcome.outcome_id}`,
      event_type: 'outcome',
      occurred_at: outcome.updated_at,
      title: 'Recommendation follow-up recorded',
      summary: outcome.outcome_observed
        || outcome.farmer_feedback
        || 'Recommendation outcome captured.',
      risk_level: null,
      source_id: outcome.outcome_id,
    });
  }
  for (const device of context.devices) {
    events.push({
      event_id: `ndani-${device.virtual_device_id}`,
      event_type: 'ndani_kit',
      occurred_at: device.latest_reading?.recorded_at || device.due_at || Math.floor(Date.now() / 1000),
      title: `${device.device_code} linked to farm record`,
      summary: `${device.mode === 'physical_bound' ? 'Physical Ndani Kit connected' : 'Human-assisted Virtual Ndani Kit'} with ${device.operations.completed_cycles} completed checks.`,
      risk_level: null,
      source_id: device.virtual_device_id,
    });
  }
  return events.sort((a, b) => b.occurred_at - a.occurred_at);
}

function buildReport(context: {
  farmerId: string;
  farm: FarmerFarm;
  profile: FarmerAiProfile | null;
  checkins: WeeklyFarmCheckin[];
  plans: AiFarmPlan[];
  outcomes: AiRecommendationOutcome[];
  devices: any[];
}): FarmerAiReport {
  const latestCheckin = context.checkins[0];
  const highRiskWeeks = context.checkins.filter((item) => item.risk_level === 'high').length;
  const reviews = context.plans.filter((plan) => plan.coordinator_review_required).length;
  const crops = unique([
    ...context.checkins.map((item) => item.crop).filter(Boolean),
    context.profile?.current_crop,
    ...(context.profile?.main_crops ?? []),
  ]);
  return {
    report_version: 'farmer-ai-report-v1',
    generated_at: Math.floor(Date.now() / 1000),
    farmer_id: context.farmerId,
    farm: {
      farm_id: context.farm.farm_id,
      name: context.farm.display_name,
      site_id: context.farm.site_id,
    },
    profile: context.profile
      ? {
          current_crop: context.profile.current_crop,
          current_crop_stage: context.profile.current_crop_stage,
          main_crops: context.profile.main_crops,
          primary_goal: context.profile.primary_goal,
          primary_pain_point: context.profile.primary_pain_point,
          water_access: context.profile.water_access,
          irrigation_method: context.profile.irrigation_method,
          soil_type: context.profile.soil_type,
          ai_manager_brief: context.profile.ai_manager_brief,
        }
      : null,
    summary: {
      checkins: context.checkins.length,
      plans: context.plans.length,
      outcomes: context.outcomes.length,
      high_risk_weeks: highRiskWeeks,
      latest_risk_level: latestCheckin?.risk_level ?? null,
      coordinator_reviews_recommended: reviews,
      virtual_ndani_devices: context.devices.length,
    },
    crop_journey: crops.length > 0
      ? crops.map((crop) => `${crop} appears in this farm’s AI record.`)
      : ['No crop journey has been recorded yet.'],
    weekly_observation_summary: context.checkins.slice(0, 8).map((checkin) => (
      `${formatDate(checkin.week_start)}: ${checkin.crop || 'crop not named'} — soil ${pretty(checkin.soil_condition)}, plants ${pretty(checkin.plant_condition)}, pests ${pretty(checkin.pest_disease_signs)}.`
    )),
    advice_summary: context.plans.slice(0, 8).map((plan) => (
      `${formatDate(plan.created_at)}: ${plan.main_issue || 'weekly guidance'} — ${plan.recommended_actions.length} recommended action(s).`
    )),
    follow_up_questions: context.plans
      .map((plan) => plan.follow_up_question)
      .filter((question): question is string => Boolean(question))
      .slice(0, 8),
    lessons_learned: lessonsLearned(context.checkins, context.plans),
    next_season_recommendations: nextSeasonRecommendations(context.profile, context.checkins),
    physical_ndani_kit_readiness: physicalReadiness(context.devices, context.checkins),
    privacy_and_control_statement:
      'This report is built from this farmer’s EdgeChain records. In production, the farmer should control access to farm data, Ndani Kit identity, AI memory, and any participation in federated learning or research.',
  };
}

function lessonsLearned(checkins: WeeklyFarmCheckin[], plans: AiFarmPlan[]): string[] {
  const lessons: string[] = [];
  if (checkins.some((item) => item.soil_condition === 'dry' || item.soil_condition === 'very_dry')) {
    lessons.push('Water timing and soil moisture should remain a weekly focus.');
  }
  if (checkins.some((item) => item.pest_disease_signs === 'some' || item.pest_disease_signs === 'severe')) {
    lessons.push('Pest and disease scouting should be recorded early, before advice becomes risky or expensive.');
  }
  if (plans.some((plan) => plan.coordinator_review_required)) {
    lessons.push('Some weeks needed coordinator review, which is a safety feature rather than a failure.');
  }
  if (lessons.length === 0) {
    lessons.push('The farm record is still young; consistent weekly check-ins will make the AI manager more useful.');
  }
  return lessons;
}

function nextSeasonRecommendations(
  profile: FarmerAiProfile | null,
  checkins: WeeklyFarmCheckin[]
): string[] {
  const recommendations = [
    'Continue weekly check-ins so the AI Farm Manager can compare conditions over time.',
    'Use Ndani Kit records to separate human observations from physical sensor measurements.',
  ];
  if (profile?.water_access || checkins.some((item) => item.soil_condition === 'dry')) {
    recommendations.push('Plan water-sensitive crop stages in advance and record irrigation constraints clearly.');
  }
  if (checkins.some((item) => item.pest_disease_signs !== 'none')) {
    recommendations.push('Keep a simple pest scouting habit: inspect several plants and record where symptoms appear.');
  }
  return recommendations;
}

function physicalReadiness(devices: any[], checkins: WeeklyFarmCheckin[]): string {
  const completedCycles = devices.reduce(
    (sum, device) => sum + Number(device.operations?.completed_cycles ?? 0),
    0
  );
  if (devices.some((device) => device.mode === 'physical_bound')) {
    return 'This farm already has a physical Ndani Kit binding recorded; manual history remains valuable context.';
  }
  if (checkins.length >= 3 || completedCycles >= 3) {
    return 'This farm has enough manual engagement to justify prioritizing a physical Ndani Kit when hardware becomes available.';
  }
  return 'This farm should build more weekly history before physical Ndani Kit prioritization is assessed.';
}

function pretty(value: string | null | undefined): string {
  return value ? value.replace(/_/g, ' ') : 'not recorded';
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.flatMap((value) => {
    const text = value?.trim();
    return text ? [text] : [];
  })));
}

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}
