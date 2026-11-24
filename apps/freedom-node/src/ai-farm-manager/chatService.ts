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
import { loadFarmForecast } from './farmForecast';
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
  rain_forecast?: {
    source: 'Open-Meteo';
    location: 'farm' | 'odzi';
    timezone: string;
    checked_at: string;
    peak_time_local: string;
    peak_probability_percent: number;
  } | null;
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
    replyLanguage?: 'en' | 'sn';
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
      preferredLanguage: input.replyLanguage ?? input.preferredLanguage,
      useRequestedLanguage: Boolean(input.replyLanguage),
    });
    // Give common rain questions a direct answer even if the model is unavailable.
    const question = text.toLowerCase().replace(/[?.!]+$/u, '').trim();
    const isSimpleRainQuestion = /^(?:nhasi (?:kunonaya|kuchanaya|mvura ichanaya) here|(?:kuchanaya|kunonaya|mvura ichanaya) here nhasi|will it rain today|is it going to rain today)$/u.test(question);
    if (isSimpleRainQuestion || /\b(?:weather|forecast|rain|kunaya|kunonaya|kuchanaya|ichanaya|mamiriro ekunze)\b/u.test(question)) {
      const forecast = await loadFarmForecast(input.farmerId, farm.farm_id);
      pack.rain_forecast = forecast && {
        source: 'Open-Meteo',
        location: forecast.location,
        timezone: forecast.timezone,
        checked_at: forecast.checked_at,
        peak_time_local: new Intl.DateTimeFormat('en-ZW', {
          timeZone: forecast.timezone, hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(forecast.peak_time * 1000),
        peak_probability_percent: forecast.probability,
      };
    }
    if (isSimpleRainQuestion) return rainReply(pack, !/^(?:will|is) /u.test(question));

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
  useRequestedLanguage: boolean;
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
      preferred_language: (input.useRequestedLanguage ? input.preferredLanguage : profile?.preferred_language)
        ?? input.preferredLanguage ?? 'sn-en',
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

function rainReply(pack: FarmManagerChatContextPack, questionInShona: boolean): FarmManagerChatReply {
  const forecast = pack.rain_forecast;
  const language = pack.farmer.preferred_language;
  const shona = language === 'sn' || (language === 'sn-en' && questionInShona);
  let answer = shona
    ? 'Handisi kukwanisa kuwana fungidziro yemvura izvozvi. Edzai zvakare pashure.'
    : 'The rain forecast is unavailable right now. Please try again later.';
  if (forecast) {
    const place = forecast.location === 'odzi'
      ? (shona ? 'Munharaunda yeOdzi' : 'For the Odzi area')
      : pack.farm.name;
    const chance = forecast.peak_probability_percent;
    const time = forecast.peak_time_local;
    const outlook = shona
      ? (chance === 0 ? 'Mvura ingangosanaya nhasi.' : `Mukana mukuru wekunaya kwemvura nhasi i${chance}% nenguva dzinenge ${time}.`)
      : (chance === 0 ? 'Rain looks unlikely for the rest of today.' : `The highest chance of rain for the rest of today is ${chance}% around ${time}.`);
    answer = `${place}: ${outlook}\nOpen-Meteo · ${forecast.timezone}`;
  }
  return {
    answer,
    shona_summary: null,
    recommended_next_step: null,
    missing_information: forecast ? [] : ['rain_forecast'],
    evidence_used: [],
    confidence: forecast ? 'medium' : 'low',
    coordinator_review_required: false,
    safety_flags: [],
    provider: 'edgechain',
    model: 'rain-forecast',
    validation_status: forecast ? 'valid' : 'fallback',
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
  const shona = pack.farmer.preferred_language === 'sn';
  if (shona) {
    return {
      answer: 'Mubatsiri wemibvunzo haasi kushanda izvozvi. Edzai zvakare pashure. Munganyora zvamaona mumunda pane peji rekuongorora munda kwevhiki.',
      shona_summary: null,
      recommended_next_step: null,
      missing_information: [],
      evidence_used: [],
      confidence: 'low',
      coordinator_review_required: safetyFlags.length > 0,
      safety_flags: safetyFlags,
      provider: 'edgechain',
      model: 'deterministic-chat-pilot',
      validation_status: 'fallback',
    };
  }
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
