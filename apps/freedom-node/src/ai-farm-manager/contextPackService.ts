import { authRepository } from '../auth/authRepository';
import {
  AiFarmPlan,
  FarmerAiMemory,
  FarmerAiProfile,
  WeeklyFarmCheckin,
} from './domain';
import { aiFarmManagerRepository } from './repository';

export interface FarmManagerContextPack {
  context_pack_version: 'farm-manager-context-v1';
  farmer: {
    farmer_id: string;
    preferred_language: string;
  };
  farm: {
    farm_id: string | null;
    name: string | null;
    site_id: string | null;
  };
  ai_profile: FarmerAiProfile | null;
  current_checkin: WeeklyFarmCheckin;
  recent_checkins: WeeklyFarmCheckin[];
  important_memories: FarmerAiMemory[];
  recent_plans: AiFarmPlan[];
  agronomy_playbook_snippets: Array<{
    key: string;
    guidance: string;
  }>;
}

export const farmManagerContextPackService = {
  async buildWeeklyPlanPack(checkin: WeeklyFarmCheckin): Promise<FarmManagerContextPack> {
    const [farms, profile, recentCheckins, memories, recentPlans] = await Promise.all([
      authRepository.listFarms(checkin.farmer_id),
      aiFarmManagerRepository.getActiveProfile({
        farmerId: checkin.farmer_id,
        farmId: checkin.farm_id ?? undefined,
      }),
      aiFarmManagerRepository.listCheckins({
        farmerId: checkin.farmer_id,
        farmId: checkin.farm_id ?? undefined,
        limit: 3,
      }),
      aiFarmManagerRepository.listContextMemories({
        farmerId: checkin.farmer_id,
        farmId: checkin.farm_id ?? undefined,
        limit: 5,
      }),
      aiFarmManagerRepository.listPlans({
        farmerId: checkin.farmer_id,
        farmId: checkin.farm_id ?? undefined,
        limit: 2,
      }),
    ]);
    const farm = farms.find((candidate) => candidate.farm_id === checkin.farm_id)
      ?? farms[0]
      ?? null;
    return {
      context_pack_version: 'farm-manager-context-v1',
      farmer: {
        farmer_id: checkin.farmer_id,
        preferred_language: profile?.preferred_language ?? 'sn-en',
      },
      farm: {
        farm_id: farm?.farm_id ?? checkin.farm_id,
        name: farm?.display_name ?? null,
        site_id: farm?.site_id ?? null,
      },
      ai_profile: profile ?? null,
      current_checkin: checkin,
      recent_checkins: recentCheckins.filter(
        (candidate) => candidate.checkin_id !== checkin.checkin_id
      ),
      important_memories: memories,
      recent_plans: recentPlans,
      agronomy_playbook_snippets: playbookSnippets(checkin, profile),
    };
  },
};

export function contextSourceCounts(pack: FarmManagerContextPack): Record<string, number> {
  return {
    profile: pack.ai_profile ? 1 : 0,
    checkin: 1 + pack.recent_checkins.length,
    memory: pack.important_memories.length,
    previous_plan: pack.recent_plans.length,
    playbook: pack.agronomy_playbook_snippets.length,
  };
}

function playbookSnippets(
  checkin: WeeklyFarmCheckin,
  profile: FarmerAiProfile | undefined
): FarmManagerContextPack['agronomy_playbook_snippets'] {
  const crop = (checkin.crop || profile?.current_crop || '').toLowerCase();
  const snippets: FarmManagerContextPack['agronomy_playbook_snippets'] = [];
  if (checkin.soil_condition === 'dry' || checkin.soil_condition === 'very_dry') {
    snippets.push({
      key: 'general.irrigation.low_water',
      guidance: 'When water is limited, irrigate early morning or late afternoon and prioritize crops at flowering or fruiting stage.',
    });
  }
  if (checkin.soil_condition === 'waterlogged') {
    snippets.push({
      key: 'general.drainage.waterlogging',
      guidance: 'Waterlogged soil can damage roots. Avoid adding more water and create safe drainage where possible.',
    });
  }
  if (checkin.pest_disease_signs !== 'none') {
    snippets.push({
      key: 'general.pest_scouting.safe_first_step',
      guidance: 'Before chemical advice, inspect multiple plants, record symptoms, and request coordinator review for severe signs.',
    });
  }
  if (crop.includes('tomato')) {
    snippets.push({
      key: 'tomato.flowering.water_stress',
      guidance: 'Tomato flowering stage is sensitive to water stress. Irregular watering can reduce fruit set.',
    });
  }
  if (snippets.length === 0) {
    snippets.push({
      key: 'general.weekly_monitoring',
      guidance: 'Weekly observation of soil, plant condition, pests, and farmer actions improves advice quality over time.',
    });
  }
  return snippets.slice(0, 3);
}
