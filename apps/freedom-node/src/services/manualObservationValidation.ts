import { ManualObservationDraft, ValidationStatus } from '../types/manualObservation';

export const MANUAL_OBSERVATION_OPTIONS = {
  crop_type: ['horticulture', 'maize', 'tobacco'],
  crop_stage: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest', 'off_season'],
  rain_level: ['none', 'light', 'moderate', 'heavy'],
  soil_condition: ['very_dry', 'dry', 'moist', 'wet', 'waterlogged'],
  plant_condition: ['good', 'fair', 'poor'],
  pest_or_disease_signs: ['none', 'some', 'severe'],
  irrigated_today: ['yes', 'no', 'unknown'],
} as const;

const REQUIRED_FIELDS: Array<keyof ManualObservationDraft> = [
  'site_id',
  'crop_type',
  'crop_stage',
  'rain_level',
  'soil_condition',
  'plant_condition',
  'pest_or_disease_signs',
  'irrigated_today',
];

export function normalizeChoice(input: string): string {
  return input.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function validateManualObservation(draft: ManualObservationDraft): {
  status: ValidationStatus;
  errors: string[];
} {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!draft[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (draft.site_id && !/^site-\d{3}$/i.test(draft.site_id)) {
    errors.push('site_id must look like site-001');
  }

  if (draft.notes && draft.notes.length > 500) {
    errors.push('notes must be 500 characters or fewer');
  }

  if (draft.soil_condition === 'waterlogged' && draft.rain_level === 'none' && draft.irrigated_today === 'no') {
    errors.push('waterlogged soil with no rain or irrigation needs coordinator review');
  }

  if (draft.plant_condition === 'poor' || draft.pest_or_disease_signs === 'severe') {
    return { status: errors.length > 0 ? 'invalid' : 'flagged', errors };
  }

  return { status: errors.length > 0 ? 'invalid' : 'valid', errors };
}

export function formatManualObservationSummary(draft: ManualObservationDraft): string {
  return [
    'Please confirm this EdgeChain observation:',
    '',
    `Site: ${draft.site_id || '-'}`,
    `Crop: ${draft.crop_type || '-'}`,
    `Crop stage: ${draft.crop_stage || '-'}`,
    `Rain: ${draft.rain_level || '-'}`,
    `Soil: ${draft.soil_condition || '-'}`,
    `Plant condition: ${draft.plant_condition || '-'}`,
    `Pest/disease signs: ${draft.pest_or_disease_signs || '-'}`,
    `Irrigated today: ${draft.irrigated_today || '-'}`,
    `Photo: ${draft.photo_status || 'skipped'}`,
    `Notes: ${draft.notes || '-'}`,
    '',
    'Reply YES to submit or EDIT to start over.',
  ].join('\n');
}
