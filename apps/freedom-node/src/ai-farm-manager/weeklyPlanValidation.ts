import {
  FarmManagerConfidence,
  FarmManagerEvidenceUsed,
  FarmManagerRecommendedAction,
  FarmManagerRiskLevel,
} from './domain';
import { FarmManagerContextPack } from './contextPackService';

export interface ValidatedWeeklyPlanOutput {
  riskLevel: FarmManagerRiskLevel;
  confidence: FarmManagerConfidence;
  summary: string;
  mainIssue: string;
  recommendedActions: FarmManagerRecommendedAction[];
  simpleExplanation: string;
  shonaSummary: string | null;
  followUpQuestion: string;
  missingInformation: string[];
  evidenceUsed: FarmManagerEvidenceUsed[];
  safetyFlags: string[];
  coordinatorReviewRequired: boolean;
  rawOutput: Record<string, unknown>;
}

const RISK_LEVELS = ['low', 'medium', 'high'] as const;
const CONFIDENCE = ['low', 'medium', 'high'] as const;
const COST_LEVELS = ['none', 'low', 'medium', 'high'] as const;
const DIFFICULTY = ['easy', 'moderate', 'difficult'] as const;
const EVIDENCE_TYPES = ['profile', 'memory', 'checkin', 'ndani_reading', 'previous_plan', 'playbook'] as const;
const UNSAFE_TERMS = [
  'pesticide',
  'herbicide',
  'fungicide',
  'chemical',
  'dosage',
  'dose',
  'spray',
  'fertilizer rate',
  'sensor measured',
  'hardware measured',
];

export class WeeklyPlanValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function validateWeeklyPlanOutput(
  value: unknown,
  pack: FarmManagerContextPack
): ValidatedWeeklyPlanOutput {
  if (!isRecord(value)) throw new WeeklyPlanValidationError('weekly_plan_not_object');
  const riskLevel = enumValue(value.risk_level, RISK_LEVELS, 'invalid_risk_level');
  const confidence = enumValue(value.confidence, CONFIDENCE, 'invalid_confidence');
  const summary = text(value.farm_status_summary, 600, 'missing_summary');
  const mainIssue = text(value.main_issue, 160, 'missing_main_issue');
  const recommendedActions = actionList(value.recommended_actions);
  const simpleExplanation = text(value.simple_explanation, 700, 'missing_simple_explanation');
  const shonaSummary = optionalText(value.shona_summary, 500);
  const followUpQuestion = text(value.follow_up_question, 240, 'missing_follow_up_question');
  const missingInformation = stringList(value.missing_information, 8, 80);
  const evidenceUsed = evidenceList(value.evidence_used, pack);
  const safetyFlags = Array.from(new Set([
    ...stringList(value.safety_flags, 12, 80),
    ...safetyFlagsForText([
      summary,
      mainIssue,
      simpleExplanation,
      followUpQuestion,
      ...recommendedActions.flatMap((action) => [action.title, action.action, action.reason]),
    ].join('\n')),
  ]));
  const coordinatorReviewRequired = Boolean(value.coordinator_review_required)
    || riskLevel === 'high'
    || confidence === 'low'
    || safetyFlags.length > 0;
  return {
    riskLevel,
    confidence,
    summary,
    mainIssue,
    recommendedActions,
    simpleExplanation,
    shonaSummary,
    followUpQuestion,
    missingInformation,
    evidenceUsed,
    safetyFlags,
    coordinatorReviewRequired,
    rawOutput: value,
  };
}

function actionList(value: unknown): FarmManagerRecommendedAction[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new WeeklyPlanValidationError('missing_actions');
  }
  return value.slice(0, 4).map((item, index) => {
    if (!isRecord(item)) throw new WeeklyPlanValidationError('invalid_action');
    return {
      priority: Number.isInteger(item.priority) ? Number(item.priority) : index + 1,
      title: text(item.title, 120, 'invalid_action_title'),
      action: text(item.action, 600, 'invalid_action_body'),
      reason: text(item.reason, 400, 'invalid_action_reason'),
      timeframe: text(item.timeframe, 80, 'invalid_action_timeframe'),
      cost_level: enumValue(item.cost_level, COST_LEVELS, 'invalid_action_cost'),
      difficulty: enumValue(item.difficulty, DIFFICULTY, 'invalid_action_difficulty'),
      shona_phrase: optionalText(item.shona_phrase, 160) ?? undefined,
    };
  });
}

function evidenceList(
  value: unknown,
  pack: FarmManagerContextPack
): FarmManagerEvidenceUsed[] {
  if (!Array.isArray(value)) return [];
  const allowedIds = new Set([
    pack.current_checkin.checkin_id,
    pack.ai_profile?.profile_id,
    ...pack.recent_checkins.map((item) => item.checkin_id),
    ...pack.important_memories.map((item) => item.memory_id),
    ...pack.recent_plans.map((item) => item.plan_id),
    ...pack.agronomy_playbook_snippets.map((item) => item.key),
  ].filter((item): item is string => Boolean(item)));
  return value.slice(0, 8).flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = optionalText(item.id, 120);
    if (!id || !allowedIds.has(id)) return [];
    return [{
      type: enumValue(item.type, EVIDENCE_TYPES, 'invalid_evidence_type'),
      id,
      summary: optionalText(item.summary, 300) ?? 'Evidence from context pack.',
    }];
  });
}

function safetyFlagsForText(textValue: string): string[] {
  const normalized = textValue.toLowerCase();
  return UNSAFE_TERMS.filter((term) => normalized.includes(term)).map(
    (term) => `unsafe_or_review_term:${term.replace(/\s+/g, '_')}`
  );
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  code: string
): T[number] {
  const candidate = String(value ?? '').trim();
  if (allowed.includes(candidate)) return candidate as T[number];
  throw new WeeklyPlanValidationError(code);
}

function text(value: unknown, maxLength: number, code: string): string {
  const result = optionalText(value, maxLength);
  if (!result) throw new WeeklyPlanValidationError(code);
  return result;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result ? result.slice(0, maxLength) : null;
}

function stringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const result = optionalText(item, maxLength);
    return result ? [result] : [];
  }).slice(0, maxItems);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
