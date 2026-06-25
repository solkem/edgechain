import {
  EXTRACTION_SCHEMA_VERSION,
  ObservationExtraction,
  ObservationField,
} from '../domain/observationExtraction';
import { ExtractionContext } from './modelGateway';

const PENDING_OPTIONS: Record<ObservationField, string[]> = {
  crop_type: ['horticulture', 'maize', 'tobacco'],
  crop_stage: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest', 'off_season'],
  rain_level: ['none', 'light', 'moderate', 'heavy'],
  soil_condition: ['very_dry', 'dry', 'moist', 'wet', 'waterlogged'],
  plant_condition: ['good', 'fair', 'poor'],
  pest_or_disease_signs: ['none', 'some', 'severe'],
  irrigated_today: ['yes', 'no', 'unknown'],
};

export function heuristicObservationExtraction(context: ExtractionContext): ObservationExtraction {
  const text = context.farmerMessage.trim();
  const normalized = text.toLowerCase();
  if (normalized === 'cancel') return empty('cancel');
  if (normalized === 'edit') return empty('edit');

  const fields: ObservationExtraction['fields'] = {};
  const pending = context.pendingField;
  if (pending && context.pendingValue && /^(yes|y|correct|hongu)$/.test(normalized)) {
    fields[pending] = {
      value: context.pendingValue,
      confidence: 1,
      evidence: text,
    };
  }
  if (pending && !fields[pending]) {
    const exactOption = PENDING_OPTIONS[pending].find(
      (option) => option.replace(/_/g, ' ') === normalized.replace(/[-_]/g, ' ')
    );
    if (exactOption) {
      fields[pending] = {
        value: exactOption,
        confidence: 0.99,
        evidence: text,
      };
    }
  }
  const numeric = Number.parseInt(normalized, 10);
  if (pending && /^\d+$/.test(normalized) && numeric >= 1) {
    const value = PENDING_OPTIONS[pending][numeric - 1];
    if (value) {
      fields[pending] = { value, confidence: 0.99, evidence: text };
    }
  }

  match(fields, 'crop_type', normalized, [
    ['maize', /\b(maize|corn|chibage|emaize)\b/],
    ['tobacco', /\b(tobacco|fodya)\b/],
    ['horticulture', /\b(horticulture|vegetable|tomato|cabbage|onion|muriwo)\b/],
  ]);
  match(fields, 'crop_stage', normalized, [
    ['off_season', /\b(off[- ]season|not planted)\b/],
    ['seedling', /\b(seedling|seedlings|mbesa)\b/],
    ['vegetative', /\b(vegetative|growing leaves)\b/],
    ['flowering', /\b(flowering|flowers|maruva)\b/],
    ['fruiting', /\b(fruiting|forming fruit)\b/],
    ['harvest', /\b(harvest|harvesting|ready to harvest)\b/],
  ]);
  match(fields, 'rain_level', normalized, [
    ['none', /\b(no rain|hapana mvura|hakuna mvura)\b/],
    ['heavy', /\b(heavy rain|raining heavily|mvura zhinji)\b/],
    ['moderate', /\b(moderate rain)\b/],
    ['light', /\b(light rain|drizzle)\b/],
  ]);
  match(fields, 'soil_condition', normalized, [
    ['waterlogged', /\b(waterlogged|flooded)\b/],
    ['very_dry', /\b(very dry|yakaoma zvikuru)\b/],
    ['dry', /\b(dry soil|soil is dry|ivhu rakaoma)\b/],
    ['moist', /\b(moist|nyoro)\b/],
    ['wet', /\b(wet soil|ivhu rakanyorova)\b/],
  ]);
  match(fields, 'plant_condition', normalized, [
    ['poor', /\b(drying|wilting|kuoma|zviri kufa|poor)\b/],
    ['good', /\b(healthy|look(?:s|ing)? good|zvakanaka)\b/],
    ['fair', /\b(fair|average)\b/],
  ]);
  match(fields, 'pest_or_disease_signs', normalized, [
    ['severe', /\b(severe pest|many worms|bad disease)\b/],
    ['some', /\b(pest|worm|insect|holes|spots|aphid|caterpillar)\b/],
    ['none', /\b(no pests|no disease|hapana zvipukanana)\b/],
  ]);
  match(fields, 'irrigated_today', normalized, [
    ['no', /^(no|n|2)$|\b(not irrigated|did not irrigate)\b/],
    ['yes', /^(yes|y|1)$|\b(irrigated|watered)\b/],
    ['unknown', /^(not sure|3)$/],
  ]);

  const riskHints: string[] = [];
  if (/\b(pesticide|chemical|spray dose|dosage|poison)\b/.test(normalized)) {
    riskHints.push('chemical_advice_request');
  }

  return {
    schema_version: EXTRACTION_SCHEMA_VERSION,
    intent: pending ? 'answer_follow_up' : 'report_observation',
    language: /[^\x00-\x7F]|\b(mashizha|ivhu|mvura|hapana|kuoma)\b/.test(normalized) ? 'sn-en' : 'en',
    fields,
    risk_hints: riskHints,
    unresolved: [],
  };
}

function match(
  fields: ObservationExtraction['fields'],
  field: ObservationField,
  text: string,
  patterns: Array<[string, RegExp]>
): void {
  if (fields[field]) return;
  for (const [value, pattern] of patterns) {
    const matchResult = text.match(pattern);
    if (matchResult) {
      fields[field] = {
        value,
        confidence: 0.86,
        evidence: matchResult[0],
      };
      return;
    }
  }
}

function empty(intent: 'cancel' | 'edit'): ObservationExtraction {
  return {
    schema_version: EXTRACTION_SCHEMA_VERSION,
    intent,
    language: 'unknown',
    fields: {},
    risk_hints: [],
    unresolved: [],
  };
}
