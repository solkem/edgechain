import {
  FarmManagerConfidence,
  FarmManagerEvidenceUsed,
} from './domain';
import type { FarmManagerChatContextPack, FarmManagerChatReply } from './chatService';

export type ValidatedFarmManagerChatOutput = Omit<
  FarmManagerChatReply,
  'provider' | 'model' | 'validation_status'
>;

const CONFIDENCE = ['low', 'medium', 'high'] as const;
const EVIDENCE_TYPES = ['profile', 'memory', 'checkin', 'ndani_reading', 'previous_plan', 'playbook'] as const;
const REVIEW_TERMS = [
  'pesticide',
  'herbicide',
  'fungicide',
  'chemical',
  'spray',
  'dosage',
  'dose',
  'fertilizer rate',
  'sensor measured',
  'hardware measured',
];

export class ChatValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function validateFarmManagerChatOutput(
  value: unknown,
  pack: FarmManagerChatContextPack
): ValidatedFarmManagerChatOutput {
  if (!isRecord(value)) throw new ChatValidationError('chat_output_not_object');
  const answer = text(value.answer, 1600, 'missing_answer');
  const recommendedNextStep = text(value.recommended_next_step, 300, 'missing_next_step');
  const safetyFlags = Array.from(new Set([
    ...stringList(value.safety_flags, 12, 80),
    ...safetyFlagsForText(`${answer}\n${recommendedNextStep}`),
  ]));
  const confidence = enumValue(value.confidence, CONFIDENCE, 'invalid_confidence');
  return {
    answer,
    shona_summary: optionalText(value.shona_summary, 500),
    recommended_next_step: recommendedNextStep,
    missing_information: stringList(value.missing_information, 8, 80),
    evidence_used: evidenceList(value.evidence_used, pack),
    confidence,
    coordinator_review_required:
      Boolean(value.coordinator_review_required)
      || confidence === 'low'
      || safetyFlags.length > 0,
    safety_flags: safetyFlags,
  };
}

function evidenceList(
  value: unknown,
  pack: FarmManagerChatContextPack
): FarmManagerEvidenceUsed[] {
  if (!Array.isArray(value)) return [];
  const allowedIds = new Set([
    pack.ai_profile?.profile_id,
    ...pack.recent_checkins.map((item) => item.checkin_id),
    ...pack.important_memories.map((item) => item.memory_id),
    ...pack.recent_plans.map((item) => item.plan_id),
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
  return REVIEW_TERMS.filter((term) => normalized.includes(term)).map(
    (term) => `review_term:${term.replace(/\s+/g, '_')}`
  );
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  code: string
): T[number] {
  const candidate = String(value ?? '').trim();
  if (allowed.includes(candidate)) return candidate as T[number];
  throw new ChatValidationError(code);
}

function text(value: unknown, maxLength: number, code: string): string {
  const result = optionalText(value, maxLength);
  if (!result) throw new ChatValidationError(code);
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
