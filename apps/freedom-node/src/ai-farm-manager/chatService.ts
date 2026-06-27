import { authRepository } from '../auth/authRepository';
import { FarmerFarm } from '../auth/authRepository';
import {
  AiFarmPlan,
  FarmerAiMemory,
  FarmerAiProfile,
  FarmManagerConfidence,
  FarmManagerEvidenceUsed,
  WeeklyFarmCheckin,
} from './domain';
import { aiFarmManagerRepository } from './repository';
import { chatGateway } from './chatGateway';
import { CHAT_PROMPT_FAMILY, CHAT_PROMPT_VERSION } from './chatPrompt';
import {
  ChatValidationError,
  ValidatedFarmManagerChatOutput,
  validateFarmManagerChatOutput,
} from './chatValidation';

export interface FarmManagerChatContextPack {
  context_pack_version: 'farm-manager-chat-context-v1';
  farmer: {
    farmer_id: string;
    preferred_language: string;
  };
  farm: {
    farm_id: string;
    name: string;
    site_id: string;
  };
  ai_profile: FarmerAiProfile | null;
  recent_checkins: WeeklyFarmCheckin[];
  important_memories: FarmerAiMemory[];
  recent_plans: AiFarmPlan[];
  farmer_question: string;
}

export interface FarmManagerChatReply {
  answer: string;
  shona_summary: string | null;
  recommended_next_step: string | null;
  missing_information: string[];
  evidence_used: FarmManagerEvidenceUsed[];
  confidence: FarmManagerConfidence;
  coordinator_review_required: boolean;
  safety_flags: string[];
  provider: string;
  model: string;
  validation_status: 'valid' | 'fallback';
}

export class FarmManagerChatError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const farmManagerChatService = {
  async reply(input: {
    farmerId: string;
    farmId: string;
    text: string;
    preferredLanguage?: string;
  }): Promise<FarmManagerChatReply> {
    const text = String(input.text ?? '').trim();
    if (!text || text.length > 2_000) {
      throw new FarmManagerChatError('message_must_contain_1_to_2000_characters', 400);
    }
    const farm = await resolveFarm(input.farmerId, input.farmId);
    const pack = await buildChatContextPack({
      farmerId: input.farmerId,
      farm,
      text,
      preferredLanguage: input.preferredLanguage,
    });
    const modelResult = await chatGateway.generate(pack);
    if (modelResult.status === 'success' && modelResult.output) {
      try {
        const validated = validateFarmManagerChatOutput(modelResult.output, pack);
        await aiFarmManagerRepository.recordPromptInvocation({
          farmerId: input.farmerId,
          farmId: farm.farm_id,
          promptFamily: modelResult.promptFamily,
          promptVersion: modelResult.promptVersion,
          modelProvider: modelResult.provider,
          modelName: modelResult.model,
          inputTokenCount: modelResult.inputTokens,
          outputTokenCount: modelResult.outputTokens,
          estimatedCostUsd: modelResult.estimatedCostUsd,
          latencyMs: modelResult.latencyMs,
          status: 'success',
          contextSourceCounts: chatContextSourceCounts(pack),
          safetyFlags: validated.safety_flags,
        });
        return toReply(validated, modelResult.provider, modelResult.model, 'valid');
      } catch (error) {
        await aiFarmManagerRepository.recordPromptInvocation({
          farmerId: input.farmerId,
          farmId: farm.farm_id,
          promptFamily: modelResult.promptFamily,
          promptVersion: modelResult.promptVersion,
          modelProvider: modelResult.provider,
          modelName: modelResult.model,
          inputTokenCount: modelResult.inputTokens,
          outputTokenCount: modelResult.outputTokens,
          estimatedCostUsd: modelResult.estimatedCostUsd,
          latencyMs: modelResult.latencyMs,
          status: 'validation_failed',
          errorCode: error instanceof ChatValidationError
            ? error.code
            : 'chat_validation_failed',
          contextSourceCounts: chatContextSourceCounts(pack),
        });
      }
    } else {
      await aiFarmManagerRepository.recordPromptInvocation({
        farmerId: input.farmerId,
        farmId: farm.farm_id,
        promptFamily: CHAT_PROMPT_FAMILY,
        promptVersion: CHAT_PROMPT_VERSION,
        modelProvider: modelResult.provider,
        modelName: modelResult.model,
        estimatedCostUsd: modelResult.estimatedCostUsd,
        latencyMs: modelResult.latencyMs,
        status: modelResult.status === 'error' ? 'error' : 'fallback',
        errorCode: modelResult.errorCode,
        contextSourceCounts: chatContextSourceCounts(pack),
      });
    }
    return deterministicReply(pack);
  },
};

async function resolveFarm(farmerId: string, farmId: string): Promise<FarmerFarm> {
  const farms = await authRepository.listFarms(farmerId);
  const farm = farms.find((candidate) => candidate.farm_id === farmId);
  if (!farm) throw new FarmManagerChatError('farm_not_found', 404);
  return farm;
}

async function buildChatContextPack(input: {
  farmerId: string;
  farm: FarmerFarm;
  text: string;
  preferredLanguage?: string;
}): Promise<FarmManagerChatContextPack> {
  const [profile, recentCheckins, memories, recentPlans] = await Promise.all([
    aiFarmManagerRepository.getActiveProfile({
      farmerId: input.farmerId,
      farmId: input.farm.farm_id,
    }),
    aiFarmManagerRepository.listCheckins({
      farmerId: input.farmerId,
      farmId: input.farm.farm_id,
      limit: 2,
    }),
    aiFarmManagerRepository.listContextMemories({
      farmerId: input.farmerId,
      farmId: input.farm.farm_id,
      limit: 5,
    }),
    aiFarmManagerRepository.listPlans({
      farmerId: input.farmerId,
      farmId: input.farm.farm_id,
      limit: 1,
    }),
  ]);
  return {
    context_pack_version: 'farm-manager-chat-context-v1',
    farmer: {
      farmer_id: input.farmerId,
      preferred_language: profile?.preferred_language ?? input.preferredLanguage ?? 'sn-en',
    },
    farm: {
      farm_id: input.farm.farm_id,
      name: input.farm.display_name,
      site_id: input.farm.site_id,
    },
    ai_profile: profile ?? null,
    recent_checkins: recentCheckins,
    important_memories: memories,
    recent_plans: recentPlans,
    farmer_question: input.text,
  };
}

function deterministicReply(pack: FarmManagerChatContextPack): FarmManagerChatReply {
  const profile = pack.ai_profile;
  const latestCheckin = pack.recent_checkins[0];
  const latestPlan = pack.recent_plans[0];
  const crop = latestCheckin?.crop || profile?.current_crop || profile?.main_crops[0] || 'your crop';
  const issue = latestPlan?.main_issue
    || profile?.primary_pain_point
    || latestCheckin?.farmer_biggest_worry
    || 'this week’s farm condition';
  const action = latestPlan?.recommended_actions[0];
  const answer = [
    `For ${pack.farm.name}, I am looking at ${crop} and ${issue}.`,
    latestCheckin
      ? `Your latest check-in says soil is ${pretty(latestCheckin.soil_condition)}, plants are ${pretty(latestCheckin.plant_condition)}, and pest/disease signs are ${pretty(latestCheckin.pest_disease_signs)}.`
      : 'I do not yet have a weekly check-in for this farm, so my advice is cautious.',
    action
      ? `Best next step: ${action.action}`
      : 'Best next step: record a weekly check-in, then inspect soil moisture, plant colour, and pest signs before spending money.',
  ].join('\n\n');
  const safetyFlags = safetyFlagsFor(pack.farmer_question);
  return {
    answer,
    shona_summary: `Tarisa ${crop}. Tanga nezvinhu zviri nyore uye nyora zvachinja.`,
    recommended_next_step: action?.title || 'Complete a weekly farm check-in',
    missing_information: latestCheckin ? [] : ['weekly check-in'],
    evidence_used: [
      ...(latestCheckin ? [{
        type: 'checkin' as const,
        id: latestCheckin.checkin_id,
        summary: 'Latest weekly check-in.',
      }] : []),
      ...(latestPlan ? [{
        type: 'previous_plan' as const,
        id: latestPlan.plan_id,
        summary: latestPlan.summary,
      }] : []),
      ...(profile ? [{
        type: 'profile' as const,
        id: profile.profile_id,
        summary: profile.ai_manager_brief || 'AI Farm Manager profile.',
      }] : []),
    ],
    confidence: latestCheckin ? 'medium' : 'low',
    coordinator_review_required: safetyFlags.length > 0,
    safety_flags: safetyFlags,
    provider: 'edgechain',
    model: 'deterministic-chat-pilot',
    validation_status: 'fallback',
  };
}

function toReply(
  output: ValidatedFarmManagerChatOutput,
  provider: string,
  model: string,
  validationStatus: 'valid' | 'fallback'
): FarmManagerChatReply {
  return {
    ...output,
    provider,
    model,
    validation_status: validationStatus,
  };
}

function chatContextSourceCounts(pack: FarmManagerChatContextPack): Record<string, number> {
  return {
    profile: pack.ai_profile ? 1 : 0,
    checkin: pack.recent_checkins.length,
    memory: pack.important_memories.length,
    previous_plan: pack.recent_plans.length,
  };
}

function safetyFlagsFor(text: string): string[] {
  const normalized = text.toLowerCase();
  const flags: string[] = [];
  if (/(pesticide|herbicide|fungicide|chemical|spray|dosage|dose)/.test(normalized)) {
    flags.push('chemical_or_dosage_question');
  }
  if (/(buy|purchase|loan|borrow|expensive|fertili[sz]er)/.test(normalized)) {
    flags.push('cost_or_input_purchase_question');
  }
  return flags;
}

function pretty(value: string | null | undefined): string {
  return value ? value.replace(/_/g, ' ') : 'not recorded';
}
