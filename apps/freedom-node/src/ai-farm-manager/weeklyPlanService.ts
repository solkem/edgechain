import {
  AiFarmPlan,
  FarmerAiMemory,
  FarmerAiProfile,
  FarmManagerRecommendedAction,
  FarmManagerRiskLevel,
  WeeklyFarmCheckin,
} from './domain';
import {
  FarmManagerContextPack,
  contextSourceCounts,
  farmManagerContextPackService,
} from './contextPackService';
import { aiFarmManagerRepository } from './repository';
import { weeklyPlanGateway } from './weeklyPlanGateway';
import { WEEKLY_PLAN_PROMPT_FAMILY, WEEKLY_PLAN_PROMPT_VERSION } from './weeklyPlanPrompt';
import {
  WeeklyPlanValidationError,
  validateWeeklyPlanOutput,
} from './weeklyPlanValidation';

const PROMPT_VERSION = 'deterministic-pilot-v1';

export const aiFarmManagerWeeklyPlanService = {
  async listForFarmer(farmerId: string): Promise<AiFarmPlan[]> {
    return aiFarmManagerRepository.listPlans({ farmerId, limit: 8 });
  },

  async createFromCheckin(checkin: WeeklyFarmCheckin): Promise<AiFarmPlan> {
    const pack = await farmManagerContextPackService.buildWeeklyPlanPack(checkin);
    const modelResult = await weeklyPlanGateway.generate(pack);
    if (modelResult.status === 'success' && modelResult.output) {
      try {
        const validated = validateWeeklyPlanOutput(modelResult.output, pack);
        await aiFarmManagerRepository.recordPromptInvocation({
          farmerId: checkin.farmer_id,
          farmId: checkin.farm_id,
          promptFamily: modelResult.promptFamily,
          promptVersion: modelResult.promptVersion,
          modelProvider: modelResult.provider,
          modelName: modelResult.model,
          inputTokenCount: modelResult.inputTokens,
          outputTokenCount: modelResult.outputTokens,
          estimatedCostUsd: modelResult.estimatedCostUsd,
          latencyMs: modelResult.latencyMs,
          status: 'success',
          contextSourceCounts: contextSourceCounts(pack),
          safetyFlags: validated.safetyFlags,
        });
        return aiFarmManagerRepository.createPlan({
          farmerId: checkin.farmer_id,
          farmId: checkin.farm_id,
          checkinId: checkin.checkin_id,
          promptFamily: modelResult.promptFamily,
          promptVersion: modelResult.promptVersion,
          modelProvider: modelResult.provider,
          modelName: modelResult.model,
          riskLevel: validated.riskLevel,
          confidence: validated.confidence,
          summary: validated.summary,
          mainIssue: validated.mainIssue,
          recommendedActions: validated.recommendedActions,
          simpleExplanation: validated.simpleExplanation,
          shonaSummary: validated.shonaSummary,
          followUpQuestion: validated.followUpQuestion,
          missingInformation: validated.missingInformation,
          evidenceUsed: validated.evidenceUsed,
          safetyFlags: validated.safetyFlags,
          coordinatorReviewRequired: validated.coordinatorReviewRequired,
          rawModelOutput: validated.rawOutput,
          validationStatus: 'valid',
        });
      } catch (error) {
        await aiFarmManagerRepository.recordPromptInvocation({
          farmerId: checkin.farmer_id,
          farmId: checkin.farm_id,
          promptFamily: modelResult.promptFamily,
          promptVersion: modelResult.promptVersion,
          modelProvider: modelResult.provider,
          modelName: modelResult.model,
          inputTokenCount: modelResult.inputTokens,
          outputTokenCount: modelResult.outputTokens,
          estimatedCostUsd: modelResult.estimatedCostUsd,
          latencyMs: modelResult.latencyMs,
          status: 'validation_failed',
          errorCode: error instanceof WeeklyPlanValidationError
            ? error.code
            : 'weekly_plan_validation_failed',
          contextSourceCounts: contextSourceCounts(pack),
        });
      }
    } else {
      await aiFarmManagerRepository.recordPromptInvocation({
        farmerId: checkin.farmer_id,
        farmId: checkin.farm_id,
        promptFamily: WEEKLY_PLAN_PROMPT_FAMILY,
        promptVersion: WEEKLY_PLAN_PROMPT_VERSION,
        modelProvider: modelResult.provider,
        modelName: modelResult.model,
        estimatedCostUsd: modelResult.estimatedCostUsd,
        latencyMs: modelResult.latencyMs,
        status: modelResult.status === 'error' ? 'error' : 'fallback',
        errorCode: modelResult.errorCode,
        contextSourceCounts: contextSourceCounts(pack),
      });
    }
    return createDeterministicPlan(checkin, pack);
  },
};

function createDeterministicPlan(
  checkin: WeeklyFarmCheckin,
  pack: FarmManagerContextPack
): Promise<AiFarmPlan> {
    const profile = pack.ai_profile ?? undefined;
    const memories = pack.important_memories;
    const previousPlans = pack.recent_plans;
    const riskLevel = checkin.risk_level ?? 'medium';
    const mainIssue = determineMainIssue(checkin, profile);
    const actions = buildRecommendedActions(checkin, profile);
    const missingInformation = missingInfo(checkin, profile);
    const safetyFlags = safetyFlagsFor(checkin);

    return aiFarmManagerRepository.createPlan({
      farmerId: checkin.farmer_id,
      farmId: checkin.farm_id,
      checkinId: checkin.checkin_id,
      promptFamily: WEEKLY_PLAN_PROMPT_FAMILY,
      promptVersion: PROMPT_VERSION,
      modelProvider: 'edgechain',
      modelName: 'deterministic-weekly-plan-pilot',
      riskLevel,
      confidence: missingInformation.length > 2 ? 'medium' : 'high',
      summary: buildSummary(checkin, profile, mainIssue),
      mainIssue,
      recommendedActions: actions,
      simpleExplanation: buildSimpleExplanation(checkin, mainIssue),
      shonaSummary: buildShonaSummary(checkin, mainIssue),
      followUpQuestion: buildFollowUpQuestion(checkin, profile),
      missingInformation,
      evidenceUsed: [
        {
          type: 'checkin',
          id: checkin.checkin_id,
          summary: `Weekly check-in: soil ${pretty(checkin.soil_condition)}, plants ${pretty(checkin.plant_condition)}, pests ${pretty(checkin.pest_disease_signs)}.`,
        },
        ...(profile ? [{
          type: 'profile' as const,
          id: profile.profile_id,
          summary: profile.ai_manager_brief || profile.farm_story_summary || 'AI Farm Manager profile.',
        }] : []),
        ...memories.slice(0, 3).map(memoryEvidence),
        ...previousPlans.slice(0, 1).map((plan) => ({
          type: 'previous_plan' as const,
          id: plan.plan_id,
          summary: plan.summary,
        })),
      ],
      safetyFlags,
      coordinatorReviewRequired: riskLevel === 'high' || safetyFlags.length > 0,
      rawModelOutput: {
        generator: 'deterministic',
        note: 'Pilot-safe plan generated without external LLM call.',
        context_pack_version: pack.context_pack_version,
      },
      validationStatus: 'valid',
    });
}

function determineMainIssue(
  checkin: WeeklyFarmCheckin,
  profile?: FarmerAiProfile
): string {
  if (checkin.pest_disease_signs === 'severe') return 'serious pest or disease signs';
  if (checkin.plant_condition === 'poor') return 'poor plant condition';
  if (checkin.soil_condition === 'waterlogged') return 'too much water in the soil';
  if (checkin.soil_condition === 'very_dry' || checkin.soil_condition === 'dry') {
    return 'soil moisture stress';
  }
  if (checkin.pest_disease_signs === 'some') return 'early pest or disease signs';
  if (checkin.labour_or_input_constraint) return 'input or labour constraint';
  return profile?.primary_pain_point || checkin.farmer_biggest_worry || 'weekly crop monitoring';
}

function buildRecommendedActions(
  checkin: WeeklyFarmCheckin,
  profile?: FarmerAiProfile
): FarmManagerRecommendedAction[] {
  const actions: FarmManagerRecommendedAction[] = [];
  if (checkin.soil_condition === 'very_dry' || checkin.soil_condition === 'dry') {
    actions.push({
      priority: 1,
      title: 'Protect soil moisture',
      action: 'Check soil early morning and irrigate if water is available. If possible, add mulch around the crop to reduce water loss.',
      reason: 'Dry soil can stress the crop, especially at flowering or fruiting stage.',
      timeframe: 'Today or tomorrow morning',
      cost_level: profile?.budget_constraint ? 'low' : 'medium',
      difficulty: 'moderate',
      shona_phrase: 'Chengetedza hunyoro hwevhu.',
    });
  }
  if (checkin.soil_condition === 'waterlogged') {
    actions.push({
      priority: 1,
      title: 'Move excess water away',
      action: 'Open small drainage paths where safe and avoid adding more water until the soil starts drying.',
      reason: 'Too much water can damage roots and increase disease pressure.',
      timeframe: 'Today',
      cost_level: 'none',
      difficulty: 'moderate',
      shona_phrase: 'Deredza mvura yakawandisa mumunda.',
    });
  }
  if (checkin.pest_disease_signs === 'some' || checkin.pest_disease_signs === 'severe') {
    actions.push({
      priority: actions.length + 1,
      title: 'Scout for pests and disease',
      action: 'Inspect leaves, stems, and fruit on at least five plants in different parts of the field. Take a photo or note where signs are worst.',
      reason: 'Early identification helps the coordinator or AI assistant give safer, more specific next advice.',
      timeframe: 'Within 24 hours',
      cost_level: 'none',
      difficulty: 'easy',
      shona_phrase: 'Tarisa zvirwere nezvipembenene pamashizha.',
    });
  }
  if (checkin.plant_condition === 'poor' || checkin.plant_condition === 'fair') {
    actions.push({
      priority: actions.length + 1,
      title: 'Compare weak and strong plants',
      action: 'Look for differences between weak plants and healthy plants: soil wetness, insects, leaf colour, weeds, or damage.',
      reason: 'This gives the next AI plan better evidence instead of guessing.',
      timeframe: 'This week',
      cost_level: 'none',
      difficulty: 'easy',
      shona_phrase: 'Enzanisa zvirimwa zvisina kusimba nezvakasimba.',
    });
  }
  if (checkin.labour_or_input_constraint) {
    actions.push({
      priority: actions.length + 1,
      title: 'Work around the constraint',
      action: `Plan one small action that fits the current constraint: ${checkin.labour_or_input_constraint}. Focus on the part of the field with the most risk first.`,
      reason: 'A small realistic action is better than advice the farmer cannot afford or execute.',
      timeframe: 'Before the next check-in',
      cost_level: 'low',
      difficulty: 'easy',
      shona_phrase: 'Tanga nezvaunokwanisa kuita.',
    });
  }
  if (actions.length === 0) {
    actions.push({
      priority: 1,
      title: 'Keep monitoring',
      action: 'Continue checking soil, plant colour, pests, and water once or twice this week. Record any change in the next check-in.',
      reason: 'Stable conditions are useful evidence for the farm record.',
      timeframe: 'This week',
      cost_level: 'none',
      difficulty: 'easy',
      shona_phrase: 'Ramba uchiongorora munda.',
    });
  }
  return actions.map((action, index) => ({ ...action, priority: index + 1 })).slice(0, 4);
}

function buildSummary(
  checkin: WeeklyFarmCheckin,
  profile: FarmerAiProfile | undefined,
  mainIssue: string
): string {
  const crop = checkin.crop || profile?.current_crop || 'the current crop';
  const stage = checkin.crop_stage || profile?.current_crop_stage;
  return `${crop}${stage ? ` at ${stage} stage` : ''} needs attention for ${mainIssue}. Soil is ${pretty(checkin.soil_condition)}, plant condition is ${pretty(checkin.plant_condition)}, and pest/disease signs are ${pretty(checkin.pest_disease_signs)}.`;
}

function buildSimpleExplanation(checkin: WeeklyFarmCheckin, mainIssue: string): string {
  return `The main thing this week is ${mainIssue}. This plan is based only on what was recorded in the weekly check-in and stored farm profile, so it avoids pretending to know unmeasured facts.`;
}

function buildShonaSummary(checkin: WeeklyFarmCheckin, mainIssue: string): string {
  const risk = checkin.risk_level === 'high'
    ? 'Njodzi yakakwira'
    : checkin.risk_level === 'medium'
      ? 'Njodzi iri pakati'
      : 'Njodzi yakaderera';
  return `${risk}. Chinhu chikuru svondo rino: ${mainIssue}. Tarisa munda uye nyora zvachinja.`;
}

function buildFollowUpQuestion(
  checkin: WeeklyFarmCheckin,
  profile?: FarmerAiProfile
): string {
  if (!checkin.crop && !profile?.current_crop) return 'Which crop should your AI Farm Manager focus on this week?';
  if (checkin.pest_disease_signs !== 'none') return 'Can you describe or photograph the pest or disease signs you saw?';
  if (checkin.soil_condition === 'dry' || checkin.soil_condition === 'very_dry') return 'How many times can you realistically irrigate before the next check-in?';
  if (checkin.labour_or_input_constraint) return 'Which part of the field can you manage first with the labour or inputs available?';
  return 'What one change should I check again with you next week?';
}

function missingInfo(checkin: WeeklyFarmCheckin, profile?: FarmerAiProfile): string[] {
  const missing: string[] = [];
  if (!checkin.crop && !profile?.current_crop) missing.push('current crop');
  if (!checkin.crop_stage && !profile?.current_crop_stage) missing.push('crop stage');
  if (!profile?.water_access) missing.push('water access');
  if (!profile?.soil_type) missing.push('soil type');
  return missing;
}

function safetyFlagsFor(checkin: WeeklyFarmCheckin): string[] {
  const flags: string[] = [];
  if (checkin.pest_disease_signs === 'severe') flags.push('severe_pest_or_disease_signs');
  if (checkin.plant_condition === 'poor') flags.push('poor_plant_condition');
  if (checkin.soil_condition === 'waterlogged') flags.push('waterlogging_risk');
  return flags;
}

function memoryEvidence(memory: FarmerAiMemory) {
  return {
    type: 'memory' as const,
    id: memory.memory_id,
    summary: `${memory.memory_key}: ${memory.memory_value}`,
  };
}

function pretty(value: string | null): string {
  return value ? value.replace(/_/g, ' ') : 'not recorded';
}
