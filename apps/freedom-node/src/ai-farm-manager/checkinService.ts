import { authRepository } from '../auth/authRepository';
import { virtualNdaniService } from '../virtual-ndani/service';
import { FarmManagerRiskLevel, WeeklyFarmCheckin } from './domain';
import { aiFarmManagerRepository } from './repository';

const SOIL_CONDITIONS = ['very_dry', 'dry', 'moist', 'wet', 'waterlogged'] as const;
const PLANT_CONDITIONS = ['good', 'fair', 'poor'] as const;
const PEST_DISEASE_SIGNS = ['none', 'some', 'severe'] as const;
const RAIN_CONDITIONS = ['no_recent_rain', 'light_recent_rain', 'heavy_recent_rain'] as const;
const IRRIGATION_DONE = ['yes', 'no', 'not_needed'] as const;

export class AiFarmManagerCheckinError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
  }
}

export const aiFarmManagerCheckinService = {
  async listForFarmer(farmerId: string): Promise<WeeklyFarmCheckin[]> {
    return aiFarmManagerRepository.listCheckins({ farmerId, limit: 8 });
  },

  async createForFarmer(input: {
    farmerId: string;
    farmId?: unknown;
    crop: unknown;
    cropStage: unknown;
    soilCondition: unknown;
    plantCondition: unknown;
    pestDiseaseSigns: unknown;
    rainCondition: unknown;
    irrigationDone: unknown;
    farmerBiggestWorry: unknown;
    labourOrInputConstraint: unknown;
    followedPreviousAdvice: unknown;
    observedChange: unknown;
    manualNotes: unknown;
  }): Promise<WeeklyFarmCheckin> {
    const farm = await resolveFarm(input.farmerId, input.farmId);
    const devices = await virtualNdaniService.list(input.farmerId);
    const device = devices.find((candidate) => candidate.farm_id === farm.farm_id)
      ?? devices[0]
      ?? null;
    const soilCondition = enumValue(
      input.soilCondition,
      SOIL_CONDITIONS,
      'invalid_soil_condition'
    );
    const plantCondition = enumValue(
      input.plantCondition,
      PLANT_CONDITIONS,
      'invalid_plant_condition'
    );
    const pestDiseaseSigns = enumValue(
      input.pestDiseaseSigns,
      PEST_DISEASE_SIGNS,
      'invalid_pest_disease_signs'
    );
    const rainCondition = enumValue(
      input.rainCondition,
      RAIN_CONDITIONS,
      'invalid_rain_condition'
    );
    const irrigationDone = enumValue(
      input.irrigationDone,
      IRRIGATION_DONE,
      'invalid_irrigation_done'
    );

    return aiFarmManagerRepository.createCheckin({
      farmerId: input.farmerId,
      farmId: farm.farm_id,
      virtualDeviceId: device?.virtual_device_id ?? null,
      weekStart: startOfWeekEpoch(),
      crop: optionalText(input.crop, 80),
      cropStage: optionalText(input.cropStage, 80),
      soilCondition,
      plantCondition,
      pestDiseaseSigns,
      rainCondition,
      irrigationDone,
      farmerBiggestWorry: optionalText(input.farmerBiggestWorry, 400),
      labourOrInputConstraint: optionalText(input.labourOrInputConstraint, 240),
      followedPreviousAdvice: optionalBoolean(input.followedPreviousAdvice),
      observedChange: optionalText(input.observedChange, 300),
      manualNotes: optionalText(input.manualNotes, 600),
      riskLevel: deriveRiskLevel({
        soilCondition,
        plantCondition,
        pestDiseaseSigns,
        rainCondition,
        irrigationDone,
      }),
      createdBy: 'farmer',
    });
  },
};

async function resolveFarm(farmerId: string, requestedFarmId: unknown) {
  const farms = await authRepository.listFarms(farmerId);
  if (farms.length === 0) {
    throw new AiFarmManagerCheckinError('farm_not_found', 404);
  }
  const farmId = optionalText(requestedFarmId, 80);
  if (!farmId) return farms[0];
  const farm = farms.find((candidate) => candidate.farm_id === farmId);
  if (!farm) throw new AiFarmManagerCheckinError('farm_not_found', 404);
  return farm;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  code: string
): T[number] {
  const candidate = String(value ?? '').trim();
  if (allowed.includes(candidate)) return candidate as T[number];
  throw new AiFarmManagerCheckinError(code, 400);
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function optionalBoolean(value: unknown): boolean | null {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return null;
}

function deriveRiskLevel(input: {
  soilCondition: string;
  plantCondition: string;
  pestDiseaseSigns: string;
  rainCondition: string;
  irrigationDone: string;
}): FarmManagerRiskLevel {
  if (
    input.soilCondition === 'waterlogged'
    || input.plantCondition === 'poor'
    || input.pestDiseaseSigns === 'severe'
  ) {
    return 'high';
  }
  if (
    input.soilCondition === 'very_dry'
    || input.soilCondition === 'dry'
    || input.plantCondition === 'fair'
    || input.pestDiseaseSigns === 'some'
    || (input.rainCondition === 'no_recent_rain' && input.irrigationDone === 'no')
  ) {
    return 'medium';
  }
  return 'low';
}

function startOfWeekEpoch(date = new Date()): number {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const day = new Date(utcMidnight).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return Math.floor((utcMidnight - daysSinceMonday * 24 * 60 * 60 * 1000) / 1000);
}
