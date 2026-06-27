import { FarmManagerContextPack } from './contextPackService';

export const WEEKLY_PLAN_PROMPT_FAMILY = 'farm_manager_weekly_plan';
export const WEEKLY_PLAN_PROMPT_VERSION = '1.0.0';

export const WEEKLY_PLAN_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    confidence_reason: { type: 'string' },
    farm_status_summary: { type: 'string' },
    personalization_used: { type: 'array', items: { type: 'string' } },
    main_issue: { type: 'string' },
    recommended_actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'number' },
          title: { type: 'string' },
          action: { type: 'string' },
          reason: { type: 'string' },
          timeframe: { type: 'string' },
          cost_level: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
          difficulty: { type: 'string', enum: ['easy', 'moderate', 'difficult'] },
          shona_phrase: { type: 'string' },
        },
        required: ['priority', 'title', 'action', 'reason', 'timeframe', 'cost_level', 'difficulty'],
      },
    },
    simple_explanation: { type: 'string' },
    shona_summary: { type: 'string' },
    follow_up_question: { type: 'string' },
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
    coordinator_review_required: { type: 'boolean' },
    safety_flags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'risk_level',
    'confidence',
    'farm_status_summary',
    'main_issue',
    'recommended_actions',
    'simple_explanation',
    'follow_up_question',
    'missing_information',
    'evidence_used',
    'coordinator_review_required',
    'safety_flags',
  ],
};

export function buildWeeklyPlanPrompt(pack: FarmManagerContextPack): string {
  return [
    'You are EdgeChain AI Farm Manager, an agricultural assistant for the Odzi farmer pilot.',
    '',
    'You must:',
    '- Give practical, low-cost, locally realistic advice.',
    '- Personalize advice using only the provided farmer and farm context.',
    '- Clearly distinguish manual observations from physical sensor readings.',
    '- Never claim the Ndani Kit physically measured something unless the source says physical sensor.',
    '- Use simple language suitable for rural farmers.',
    '- Use Shona phrases when preferred_language is sn or sn-en.',
    '- Prefer safe, low-risk actions before expensive or chemical actions.',
    '- Ask one useful follow-up question.',
    '- Flag coordinator review for high-risk, chemical, expensive, severe, or uncertain advice.',
    '',
    'You must not invent weather, soil, disease, pest, price, sensor, or farm facts.',
    '',
    'Farm Manager Context Pack JSON:',
    JSON.stringify(redactRawFreeText(pack), null, 2),
    '',
    'Task:',
    'Using the Farm Manager Context Pack, create this farmer’s weekly farm manager plan.',
    'Use at least three relevant personalization facts if available.',
    'Recommend 1 to 3 practical actions.',
    'Include evidence_used entries that reference provided context IDs only.',
    'Return valid JSON only using the required schema.',
  ].join('\n');
}

function redactRawFreeText(pack: FarmManagerContextPack): FarmManagerContextPack {
  return {
    ...pack,
    current_checkin: {
      ...pack.current_checkin,
      manual_notes: pack.current_checkin.manual_notes ? '[manual notes available]' : null,
    },
  };
}
