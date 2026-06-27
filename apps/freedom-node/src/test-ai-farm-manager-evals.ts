import assert from 'assert';
import { FarmManagerContextPack } from './ai-farm-manager/contextPackService';
import { FarmManagerChatContextPack } from './ai-farm-manager/chatService';
import { validateWeeklyPlanOutput } from './ai-farm-manager/weeklyPlanValidation';
import { validateFarmManagerChatOutput } from './ai-farm-manager/chatValidation';

const now = Math.floor(Date.now() / 1000);

function baseWeeklyPack(): FarmManagerContextPack {
  return {
    context_pack_version: 'farm-manager-context-v1',
    farmer: {
      farmer_id: 'farmer-001',
      preferred_language: 'sn-en',
    },
    farm: {
      farm_id: 'farm-001',
      name: 'Odzi Demo Farm',
      site_id: 'site-001',
    },
    ai_profile: {
      profile_id: 'profile-001',
      farmer_id: 'farmer-001',
      farm_id: 'farm-001',
      preferred_language: 'sn-en',
      literacy_level: 'low',
      technology_comfort: 'low',
      primary_goal: 'improve tomato yield',
      primary_pain_point: 'limited water',
      secondary_pain_points: ['pest scouting'],
      water_access: 'limited borehole water',
      irrigation_method: 'bucket irrigation',
      budget_constraint: 'low budget',
      labour_constraint: 'family labour only',
      main_crops: ['tomato'],
      current_crop: 'tomato',
      current_crop_stage: 'flowering',
      soil_type: null,
      farm_story_summary: 'Farmer has limited water and tomato flowering risk.',
      ai_manager_brief: 'Tomato flowering, limited water, low budget.',
      brief_version: 1,
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    current_checkin: {
      checkin_id: 'checkin-001',
      farmer_id: 'farmer-001',
      farm_id: 'farm-001',
      virtual_device_id: 'device-001',
      week_start: now,
      crop: 'tomato',
      crop_stage: 'flowering',
      soil_condition: 'dry',
      plant_condition: 'fair',
      pest_disease_signs: 'none',
      rain_condition: 'no_recent_rain',
      irrigation_done: 'no',
      farmer_biggest_worry: 'plants may dry',
      labour_or_input_constraint: 'low budget',
      followed_previous_advice: null,
      observed_change: null,
      manual_notes: null,
      risk_level: 'medium',
      created_by: 'farmer',
      created_at: now,
      updated_at: now,
    },
    recent_checkins: [],
    important_memories: [
      {
        memory_id: 'memory-001',
        farmer_id: 'farmer-001',
        farm_id: 'farm-001',
        memory_type: 'constraint',
        memory_key: 'water',
        memory_value: 'Limited borehole water',
        importance: 5,
        source: 'onboarding',
        source_id: null,
        valid_from: now,
        valid_to: null,
        created_at: now,
        updated_at: now,
      },
    ],
    recent_plans: [],
    agronomy_playbook_snippets: [
      {
        key: 'tomato.flowering.water_stress',
        guidance: 'Tomato flowering is sensitive to water stress.',
      },
    ],
  };
}

function baseWeeklyOutput(overrides: Record<string, unknown> = {}) {
  return {
    risk_level: 'medium',
    confidence: 'high',
    farm_status_summary:
      'Odzi Demo Farm has tomato at flowering stage with dry soil and limited water.',
    main_issue: 'soil moisture stress',
    recommended_actions: [
      {
        priority: 1,
        title: 'Protect soil moisture',
        action: 'Water early morning if water is available and mulch with local material.',
        reason: 'Tomato flowering is sensitive to water stress.',
        timeframe: 'Today',
        cost_level: 'low',
        difficulty: 'moderate',
        shona_phrase: 'Chengetedza hunyoro hwevhu.',
      },
    ],
    simple_explanation: 'Dry soil can stress flowering tomatoes.',
    shona_summary: 'Ivhu rakaoma; chengetedza hunyoro.',
    follow_up_question: 'How many times can you irrigate before next week?',
    missing_information: ['soil type'],
    evidence_used: [
      {
        type: 'profile',
        id: 'profile-001',
        summary: 'Tomato flowering, limited water, low budget.',
      },
      {
        type: 'checkin',
        id: 'checkin-001',
        summary: 'Dry soil and fair plants.',
      },
      {
        type: 'memory',
        id: 'memory-001',
        summary: 'Limited borehole water.',
      },
    ],
    coordinator_review_required: false,
    safety_flags: [],
    ...overrides,
  };
}

function baseChatPack(): FarmManagerChatContextPack {
  const weekly = baseWeeklyPack();
  return {
    context_pack_version: 'farm-manager-chat-context-v1',
    farmer: weekly.farmer,
    farm: {
      farm_id: 'farm-001',
      name: 'Odzi Demo Farm',
      site_id: 'site-001',
    },
    ai_profile: weekly.ai_profile,
    recent_checkins: [weekly.current_checkin],
    important_memories: weekly.important_memories,
    recent_plans: [],
    farmer_question: 'What should I do this week?',
  };
}

function runWeeklyPlanEvals() {
  const pack = baseWeeklyPack();

  const valid = validateWeeklyPlanOutput(baseWeeklyOutput(), pack);
  assert.equal(valid.riskLevel, 'medium');
  assert.equal(valid.recommendedActions[0].cost_level, 'low');
  assert.ok(valid.shonaSummary);
  assert.ok(valid.evidenceUsed.every((item) => (
    ['profile-001', 'checkin-001', 'memory-001'].includes(item.id)
  )));

  const severe = validateWeeklyPlanOutput(baseWeeklyOutput({
    risk_level: 'high',
    coordinator_review_required: false,
    safety_flags: ['severe_pest_or_disease_signs'],
  }), pack);
  assert.equal(severe.coordinatorReviewRequired, true);

  const unsupportedEvidence = validateWeeklyPlanOutput(baseWeeklyOutput({
    evidence_used: [
      { type: 'checkin', id: 'other-farmer-checkin', summary: 'Should be ignored.' },
      { type: 'checkin', id: 'checkin-001', summary: 'Allowed.' },
    ],
  }), pack);
  assert.deepEqual(unsupportedEvidence.evidenceUsed.map((item) => item.id), ['checkin-001']);

  const sensorClaim = validateWeeklyPlanOutput(baseWeeklyOutput({
    farm_status_summary: 'The sensor measured dry soil on Odzi Demo Farm.',
  }), pack);
  assert.ok(sensorClaim.safetyFlags.some((flag) => flag.includes('sensor_measured')));
  assert.equal(sensorClaim.coordinatorReviewRequired, true);
}

function runChatEvals() {
  const pack = baseChatPack();
  const chat = validateFarmManagerChatOutput({
    answer: 'For Odzi Demo Farm, focus on tomato water stress this week.',
    shona_summary: 'Chengetedza mvura yemadomasi.',
    recommended_next_step: 'Check soil early morning.',
    missing_information: [],
    evidence_used: [
      { type: 'profile', id: 'profile-001', summary: 'Profile.' },
      { type: 'checkin', id: 'checkin-001', summary: 'Latest check-in.' },
    ],
    confidence: 'high',
    coordinator_review_required: false,
    safety_flags: [],
  }, pack);
  assert.equal(chat.confidence, 'high');
  assert.equal(chat.coordinator_review_required, false);

  const chemical = validateFarmManagerChatOutput({
    answer: 'Do not use pesticide dosage advice without coordinator review.',
    recommended_next_step: 'Ask the coordinator to inspect the crop.',
    missing_information: ['pest identity'],
    evidence_used: [{ type: 'checkin', id: 'checkin-001', summary: 'Latest check-in.' }],
    confidence: 'medium',
    coordinator_review_required: false,
    safety_flags: [],
  }, pack);
  assert.equal(chemical.coordinator_review_required, true);
  assert.ok(chemical.safety_flags.some((flag) => flag.includes('pesticide')));
}

runWeeklyPlanEvals();
runChatEvals();

console.log('AI Farm Manager evals passed');
