import type { FarmManagerChatContextPack } from './chatService';

export const CHAT_PROMPT_FAMILY = 'farm_manager_memory_chat';
export const CHAT_PROMPT_VERSION = '1.0.0';

export const CHAT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    shona_summary: { type: 'string' },
    personalization_used: { type: 'array', items: { type: 'string' } },
    recommended_next_step: { type: 'string' },
    missing_information: { type: 'array', items: { type: 'string' } },
    evidence_used: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['profile', 'memory', 'checkin', 'ndani_reading', 'previous_plan', 'playbook'] },
          id: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['type', 'id', 'summary'],
      },
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    coordinator_review_required: { type: 'boolean' },
    safety_flags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'answer',
    'recommended_next_step',
    'missing_information',
    'evidence_used',
    'confidence',
    'coordinator_review_required',
    'safety_flags',
  ],
};

export function buildChatPrompt(pack: FarmManagerChatContextPack): string {
  return [
    'You are EdgeChain AI Farm Manager for the Odzi farmer pilot.',
    'Answer the farmer as a practical farm manager who knows this specific farm.',
    'Use only the Farm Manager Context Pack. Do not invent farm facts, weather, prices, sensor readings, diseases, or measurements.',
    'Clearly distinguish human observations from hardware readings.',
    'Use simple language and include Shona when preferred_language is sn or sn-en.',
    'If the farmer asks for chemical, dosage, expensive, uncertain, or severe disease advice, give safe general guidance and require coordinator review.',
    '',
    'Farm Manager Context Pack JSON:',
    JSON.stringify(pack, null, 2),
    '',
    'Task:',
    'Answer the farmer question. Use relevant farm profile, recent check-ins, recent plans, constraints, and memories.',
    'Mention missing information if needed. Return valid JSON only.',
  ].join('\n');
}
