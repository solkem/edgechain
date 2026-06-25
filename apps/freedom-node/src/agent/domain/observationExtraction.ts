import { ManualObservationDraft } from '../../types/manualObservation';
import { classifyConfidence, selectFollowUp } from './followUpPolicy';
import { AgentEvent } from './stateMachine';

export const EXTRACTION_SCHEMA_VERSION = 'observation-extraction-v1';
export const EXTRACTION_PROMPT_VERSION = 'odzi-text-v1';

export const OBSERVATION_FIELDS = [
  'crop_type',
  'crop_stage',
  'rain_level',
  'soil_condition',
  'plant_condition',
  'pest_or_disease_signs',
  'irrigated_today',
] as const;

export type ObservationField = typeof OBSERVATION_FIELDS[number];
export type ObservationValue = NonNullable<ManualObservationDraft[ObservationField]>;

export interface ExtractedField {
  value: string;
  confidence: number;
  evidence: string;
}

export interface ObservationExtraction {
  schema_version: string;
  intent: 'report_observation' | 'answer_follow_up' | 'cancel' | 'edit' | 'other';
  language: string;
  fields: Partial<Record<ObservationField, ExtractedField>>;
  risk_hints: string[];
  unresolved: ObservationField[];
}

export interface ObservationDecision {
  draft: ManualObservationDraft;
  confidence: Partial<Record<ObservationField, number>>;
  event: AgentEvent;
  ruleResult: string;
  selectedField?: ObservationField;
  selectedValue?: string;
  explanationKey: string;
  acceptedFields: ObservationField[];
  confirmationFields: ObservationField[];
  riskFlags: string[];
  reply: string;
}

const ENUMS: Record<ObservationField, readonly string[]> = {
  crop_type: ['horticulture', 'maize', 'tobacco'],
  crop_stage: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest', 'off_season'],
  rain_level: ['none', 'light', 'moderate', 'heavy'],
  soil_condition: ['very_dry', 'dry', 'moist', 'wet', 'waterlogged'],
  plant_condition: ['good', 'fair', 'poor'],
  pest_or_disease_signs: ['none', 'some', 'severe'],
  irrigated_today: ['yes', 'no', 'unknown'],
};

export const OBSERVATION_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schema_version: { type: 'string', enum: [EXTRACTION_SCHEMA_VERSION] },
    intent: {
      type: 'string',
      enum: ['report_observation', 'answer_follow_up', 'cancel', 'edit', 'other'],
    },
    language: { type: 'string' },
    fields: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        OBSERVATION_FIELDS.map((field) => [
          field,
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              value: { type: 'string', enum: [...ENUMS[field]] },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              evidence: { type: 'string' },
            },
            required: ['value', 'confidence', 'evidence'],
          },
        ])
      ),
    },
    risk_hints: { type: 'array', items: { type: 'string' } },
    unresolved: {
      type: 'array',
      items: { type: 'string', enum: [...OBSERVATION_FIELDS] },
    },
  },
  required: ['schema_version', 'intent', 'language', 'fields', 'risk_hints', 'unresolved'],
} as const;

export function parseObservationExtraction(value: unknown): ObservationExtraction {
  if (!isRecord(value)) throw new Error('extraction must be an object');
  if (value.schema_version !== EXTRACTION_SCHEMA_VERSION) {
    throw new Error('unsupported extraction schema version');
  }
  const intents = ['report_observation', 'answer_follow_up', 'cancel', 'edit', 'other'];
  if (!intents.includes(String(value.intent))) throw new Error('invalid extraction intent');
  if (typeof value.language !== 'string' || value.language.length > 20) {
    throw new Error('invalid extraction language');
  }
  if (!isRecord(value.fields)) throw new Error('fields must be an object');

  const fields: ObservationExtraction['fields'] = {};
  for (const [key, rawField] of Object.entries(value.fields)) {
    if (!OBSERVATION_FIELDS.includes(key as ObservationField)) {
      throw new Error(`unknown extraction field: ${key}`);
    }
    if (!isRecord(rawField)) throw new Error(`invalid field: ${key}`);
    const field = key as ObservationField;
    if (!ENUMS[field].includes(String(rawField.value))) {
      throw new Error(`invalid value for ${field}`);
    }
    if (
      typeof rawField.confidence !== 'number' ||
      rawField.confidence < 0 ||
      rawField.confidence > 1
    ) {
      throw new Error(`invalid confidence for ${field}`);
    }
    if (typeof rawField.evidence !== 'string' || rawField.evidence.length > 200) {
      throw new Error(`invalid evidence for ${field}`);
    }
    fields[field] = {
      value: String(rawField.value),
      confidence: rawField.confidence,
      evidence: rawField.evidence,
    };
  }

  const riskHints = stringArray(value.risk_hints, 20);
  const unresolved = stringArray(value.unresolved, OBSERVATION_FIELDS.length)
    .map((field) => {
      if (!OBSERVATION_FIELDS.includes(field as ObservationField)) {
        throw new Error(`invalid unresolved field: ${field}`);
      }
      return field as ObservationField;
    });

  return {
    schema_version: EXTRACTION_SCHEMA_VERSION,
    intent: value.intent as ObservationExtraction['intent'],
    language: value.language,
    fields,
    risk_hints: riskHints,
    unresolved,
  };
}

export function decideObservationNextStep(params: {
  currentDraft: ManualObservationDraft;
  currentConfidence: Partial<Record<ObservationField, number>>;
  extraction: ObservationExtraction;
}): ObservationDecision {
  if (params.extraction.intent === 'cancel') {
    return baseDecision(params, 'CANCEL', 'cancel', 'farmer_cancelled', 'Observation cancelled.');
  }
  if (params.extraction.intent === 'edit') {
    return {
      ...baseDecision(params, 'EDIT', 'edit', 'farmer_requested_edit', 'Let us start the observation again.'),
      draft: {},
      confidence: {},
    };
  }

  const draft = { ...params.currentDraft };
  const confidence = { ...params.currentConfidence };
  const acceptedFields: ObservationField[] = [];
  const confirmationFields: ObservationField[] = [];

  for (const field of OBSERVATION_FIELDS) {
    const extracted = params.extraction.fields[field];
    if (!extracted) continue;
    const classification = classifyConfidence(extracted.confidence);
    if (classification === 'accept') {
      (draft as Record<string, unknown>)[field] = extracted.value;
      confidence[field] = extracted.confidence;
      acceptedFields.push(field);
    } else if (classification === 'confirm') {
      confirmationFields.push(field);
    }
  }

  const riskFlags = deterministicRiskFlags(draft, params.extraction.risk_hints);
  const contradictions = deterministicContradictions(draft);
  const missing = OBSERVATION_FIELDS.filter(
    (field) => !draft[field] && !confirmationFields.includes(field)
  );
  const followUp = selectFollowUp({
    hasSafetyRisk: riskFlags.length > 0,
    hasContradiction: contradictions.length > 0,
    missingRequiredFields: missing,
    mediumConfidenceFields: confirmationFields,
    photoEligible: false,
    photoRequested: true,
  });

  switch (followUp.decision) {
    case 'ask_risk_clarification':
      return decision(
        draft,
        confidence,
        'RISK_RULE_MATCHED',
        followUp.decision,
        undefined,
        undefined,
        'risk_requires_coordinator',
        acceptedFields,
        confirmationFields,
        riskFlags,
        'I noticed a serious or uncertain crop problem, so I am flagging this for the coordinator.'
      );
    case 'resolve_contradiction':
      return decision(
        draft,
        confidence,
        'CONTRADICTION_FOUND',
        followUp.decision,
        undefined,
        undefined,
        'contradiction_requires_clarification',
        acceptedFields,
        confirmationFields,
        contradictions,
        'I need to check one detail because parts of this report do not agree.'
      );
    case 'ask_required_field':
      return decision(
        draft,
        confidence,
        'REQUIRED_FIELD_MISSING',
        followUp.decision,
        followUp.field as ObservationField,
        undefined,
        `missing_${followUp.field}`,
        acceptedFields,
        confirmationFields,
        [],
        questionForField(followUp.field as ObservationField, draft)
      );
    case 'confirm_medium_confidence_field':
      return decision(
        draft,
        confidence,
        'FIELD_REQUIRES_CONFIRMATION',
        followUp.decision,
        followUp.field as ObservationField,
        params.extraction.fields[followUp.field as ObservationField]?.value,
        `confirm_${followUp.field}`,
        acceptedFields,
        confirmationFields,
        [],
        confirmationForField(
          followUp.field as ObservationField,
          params.extraction.fields[followUp.field as ObservationField]?.value
        )
      );
    default:
      return decision(
        draft,
        confidence,
        'READY_FOR_CONFIRMATION',
        'confirm_submission',
        undefined,
        undefined,
        'observation_complete',
        acceptedFields,
        confirmationFields,
        [],
        observationSummary(draft)
      );
  }
}

function deterministicRiskFlags(draft: ManualObservationDraft, hints: string[]): string[] {
  const flags: string[] = [];
  if (draft.pest_or_disease_signs === 'severe') flags.push('severe_pest_or_disease');
  if (draft.plant_condition === 'poor') flags.push('poor_plant_condition');
  if (hints.some((hint) => /pesticide|chemical|poison|dosage/i.test(hint))) {
    flags.push('chemical_advice_request');
  }
  return [...new Set(flags)];
}

function deterministicContradictions(draft: ManualObservationDraft): string[] {
  if (
    draft.soil_condition === 'waterlogged' &&
    draft.rain_level === 'none' &&
    draft.irrigated_today === 'no'
  ) {
    return ['waterlogged_without_rain_or_irrigation'];
  }
  return [];
}

function questionForField(field: ObservationField, draft: ManualObservationDraft): string {
  const questions: Record<ObservationField, string> = {
    crop_type: 'Which crop are you reporting: horticulture, maize, or tobacco?',
    crop_stage: 'What stage is the crop: seedling, vegetative, flowering, fruiting, harvest, or off-season?',
    rain_level: 'How much rain was there today: none, light, moderate, or heavy?',
    soil_condition: 'How does the soil look or feel: very dry, dry, moist, wet, or waterlogged?',
    plant_condition: 'How do the plants look: good, fair, or poor?',
    pest_or_disease_signs: 'Are there pest or disease signs: none, some, or severe?',
    irrigated_today: draft.soil_condition === 'dry' || draft.soil_condition === 'very_dry'
      ? 'The soil is dry, so I need to check water stress. Did you irrigate today: yes, no, or not sure?'
      : 'Did you irrigate today: yes, no, or not sure?',
  };
  return questions[field];
}

function confirmationForField(field: ObservationField, value?: string): string {
  return `I understood ${field.replace(/_/g, ' ')} as "${value || 'unknown'}". Is that correct? Reply yes or correct it.`;
}

function observationSummary(draft: ManualObservationDraft): string {
  return [
    'Please confirm this farm observation:',
    `Crop: ${draft.crop_type}`,
    `Stage: ${draft.crop_stage}`,
    `Rain: ${draft.rain_level}`,
    `Soil: ${draft.soil_condition}`,
    `Plants: ${draft.plant_condition}`,
    `Pest or disease signs: ${draft.pest_or_disease_signs}`,
    `Irrigated today: ${draft.irrigated_today}`,
    'Reply YES to submit, EDIT to restart, or CANCEL to stop.',
  ].join('\n');
}

function decision(
  draft: ManualObservationDraft,
  confidence: Partial<Record<ObservationField, number>>,
  event: AgentEvent,
  ruleResult: string,
  selectedField: ObservationField | undefined,
  selectedValue: string | undefined,
  explanationKey: string,
  acceptedFields: ObservationField[],
  confirmationFields: ObservationField[],
  riskFlags: string[],
  reply: string
): ObservationDecision {
  return {
    draft,
    confidence,
    event,
    ruleResult,
    selectedField,
    selectedValue,
    explanationKey,
    acceptedFields,
    confirmationFields,
    riskFlags,
    reply,
  };
}

function baseDecision(
  params: {
    currentDraft: ManualObservationDraft;
    currentConfidence: Partial<Record<ObservationField, number>>;
  },
  event: AgentEvent,
  ruleResult: string,
  explanationKey: string,
  reply: string
): ObservationDecision {
  return decision(
    params.currentDraft,
    params.currentConfidence,
    event,
    ruleResult,
    undefined,
    undefined,
    explanationKey,
    [],
    [],
    [],
    reply
  );
}

function stringArray(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value) || value.length > maxLength || value.some((item) => typeof item !== 'string')) {
    throw new Error('invalid string array');
  }
  return value as string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
