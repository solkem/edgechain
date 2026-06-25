export const GUIDED_READING_OPTIONS = {
  soil_moisture: ['very_dry', 'dry', 'moist', 'wet', 'waterlogged'],
  rain_condition: ['none', 'light', 'moderate', 'heavy'],
  plant_condition: ['good', 'fair', 'poor'],
  pest_disease_signs: ['none', 'some', 'severe'],
  irrigation: ['yes', 'no', 'unknown'],
} as const;

export type GuidedReadingInput = {
  soil_moisture: string;
  rain_condition: string;
  plant_condition: string;
  pest_disease_signs: string;
  irrigation: string;
  notes?: string;
  observed_at?: number;
};

export interface ValidatedGuidedReading {
  values: {
    soil_moisture: typeof GUIDED_READING_OPTIONS.soil_moisture[number];
    rain_condition: typeof GUIDED_READING_OPTIONS.rain_condition[number];
    plant_condition: typeof GUIDED_READING_OPTIONS.plant_condition[number];
    pest_disease_signs: typeof GUIDED_READING_OPTIONS.pest_disease_signs[number];
    irrigation: typeof GUIDED_READING_OPTIONS.irrigation[number];
  };
  notes?: string;
  observedAt: number;
  qualityStatus: 'accepted' | 'flagged';
  riskFlags: string[];
}

export function validateGuidedReading(input: GuidedReadingInput): ValidatedGuidedReading {
  const values = {
    soil_moisture: choice('soil_moisture', input.soil_moisture),
    rain_condition: choice('rain_condition', input.rain_condition),
    plant_condition: choice('plant_condition', input.plant_condition),
    pest_disease_signs: choice('pest_disease_signs', input.pest_disease_signs),
    irrigation: choice('irrigation', input.irrigation),
  };
  const notes = String(input.notes || '').trim();
  if (notes.length > 500) {
    throw new GuidedReadingValidationError('notes_too_long');
  }

  const observedAt = Number(input.observed_at || Math.floor(Date.now() / 1000));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(observedAt) || observedAt < now - 7 * 86400 || observedAt > now + 300) {
    throw new GuidedReadingValidationError('invalid_observed_at');
  }

  const riskFlags: string[] = [];
  if (values.plant_condition === 'poor') riskFlags.push('poor_plant_condition');
  if (values.pest_disease_signs === 'severe') riskFlags.push('severe_pest_or_disease_signs');
  if (
    values.soil_moisture === 'waterlogged'
    && values.rain_condition === 'none'
    && values.irrigation === 'no'
  ) {
    riskFlags.push('waterlogged_without_reported_water_source');
  }

  return {
    values,
    notes: notes || undefined,
    observedAt,
    qualityStatus: riskFlags.length > 0 ? 'flagged' : 'accepted',
    riskFlags,
  };
}

export class GuidedReadingValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function choice<K extends keyof typeof GUIDED_READING_OPTIONS>(
  field: K,
  rawValue: string
): (typeof GUIDED_READING_OPTIONS)[K][number] {
  const value = String(rawValue || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const options = GUIDED_READING_OPTIONS[field] as readonly string[];
  if (!options.includes(value)) {
    throw new GuidedReadingValidationError(`invalid_${field}`);
  }
  return value as (typeof GUIDED_READING_OPTIONS)[K][number];
}
