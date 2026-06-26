import { coordinatorAdministrationService } from '../virtual-ndani/coordinatorAdministrationService';
import { aiFarmManagerRepository } from './repository';
import { FarmerAiProfile, FarmManagerLanguage } from './domain';

const LANGUAGES = ['en', 'sn', 'sn-en'] as const;
const PROFILE_STATUSES = ['draft', 'active', 'needs_update', 'archived'] as const;

export class AiFarmManagerProfileError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const coordinatorAiProfileService = {
  async getProfile(farmerId: string): Promise<FarmerAiProfile | null> {
    const farmer = await coordinatorAdministrationService.findFarmer(farmerId);
    const profile = await aiFarmManagerRepository.getActiveProfile({
      farmerId,
      farmId: farmer.farm_id ?? undefined,
    });
    return profile ?? null;
  },

  async saveProfile(input: {
    farmerId: string;
    preferredLanguage: unknown;
    literacyLevel: unknown;
    technologyComfort: unknown;
    primaryGoal: unknown;
    primaryPainPoint: unknown;
    secondaryPainPoints: unknown;
    waterAccess: unknown;
    irrigationMethod: unknown;
    budgetConstraint: unknown;
    labourConstraint: unknown;
    mainCrops: unknown;
    currentCrop: unknown;
    currentCropStage: unknown;
    soilType: unknown;
    farmStorySummary: unknown;
    aiManagerBrief: unknown;
    status: unknown;
  }): Promise<FarmerAiProfile> {
    const farmer = await coordinatorAdministrationService.findFarmer(input.farmerId);
    const preferredLanguage = enumValue(
      input.preferredLanguage,
      LANGUAGES,
      'invalid_language',
      farmer.preferred_language
    );
    const status = enumValue(input.status, PROFILE_STATUSES, 'invalid_profile_status', 'active');
    const profileInput = {
      preferredLanguage,
      literacyLevel: optionalText(input.literacyLevel, 80),
      technologyComfort: optionalText(input.technologyComfort, 80),
      primaryGoal: optionalText(input.primaryGoal, 120),
      primaryPainPoint: optionalText(input.primaryPainPoint, 120),
      secondaryPainPoints: stringList(input.secondaryPainPoints, 8, 80),
      waterAccess: optionalText(input.waterAccess, 120),
      irrigationMethod: optionalText(input.irrigationMethod, 120),
      budgetConstraint: optionalText(input.budgetConstraint, 160),
      labourConstraint: optionalText(input.labourConstraint, 160),
      mainCrops: stringList(input.mainCrops, 12, 60),
      currentCrop: optionalText(input.currentCrop, 80),
      currentCropStage: optionalText(input.currentCropStage, 80),
      soilType: optionalText(input.soilType, 80),
      farmStorySummary: optionalText(input.farmStorySummary, 1200),
      status,
    };
    const brief = optionalText(input.aiManagerBrief, 1200)
      || generateBrief({
        farmerName: farmer.display_name,
        farmName: farmer.farm_display_name || 'Farm',
        primaryPainPoint: profileInput.primaryPainPoint,
        currentCrop: profileInput.currentCrop,
        currentCropStage: profileInput.currentCropStage,
        waterAccess: profileInput.waterAccess,
        mainCrops: profileInput.mainCrops,
      });

    const existing = await aiFarmManagerRepository.getActiveProfile({
      farmerId: input.farmerId,
      farmId: farmer.farm_id ?? undefined,
    });

    if (existing) {
      const updated = await aiFarmManagerRepository.updateProfile({
        profileId: existing.profile_id,
        ...profileInput,
        aiManagerBrief: brief,
      });
      if (!updated) throw new AiFarmManagerProfileError('ai_profile_not_found', 404);
      return updated;
    }

    return aiFarmManagerRepository.createProfile({
      farmerId: input.farmerId,
      farmId: farmer.farm_id,
      ...profileInput,
      aiManagerBrief: brief,
    });
  },
};

function generateBrief(input: {
  farmerName: string;
  farmName: string;
  primaryPainPoint: string | null;
  currentCrop: string | null;
  currentCropStage: string | null;
  waterAccess: string | null;
  mainCrops: string[];
}): string {
  const crop = input.currentCrop || input.mainCrops[0] || 'the current crop';
  const stage = input.currentCropStage ? ` at ${input.currentCropStage} stage` : '';
  const painPoint = input.primaryPainPoint || 'weekly farm decision support';
  const water = input.waterAccess ? ` Water context: ${input.waterAccess}.` : '';
  return `${input.farmerName}'s AI Farm Manager for ${input.farmName} should focus on ${painPoint}, with special attention to ${crop}${stage}.${water}`;
}

function optionalText(value: unknown, maximum: number): string | null {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new AiFarmManagerProfileError('profile_field_too_long', 400);
  }
  return normalized;
}

function stringList(value: unknown, maximumItems: number, maximumLength: number): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : String(value ?? '')
      .split(',')
      .map((item) => item.trim());
  const items = rawItems
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, maximumItems);
  if (items.some((item) => item.length > maximumLength)) {
    throw new AiFarmManagerProfileError('profile_list_item_too_long', 400);
  }
  return [...new Set(items)];
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  errorCode: string,
  fallback: T
): T {
  const normalized = String(value ?? fallback).trim().toLowerCase() as T;
  if (!allowed.includes(normalized)) {
    throw new AiFarmManagerProfileError(errorCode, 400);
  }
  return normalized;
}
