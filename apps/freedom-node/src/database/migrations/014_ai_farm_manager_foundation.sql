CREATE TABLE IF NOT EXISTS farmer_ai_profiles (
  profile_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE,
  preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'sn', 'sn-en')),
  literacy_level TEXT,
  technology_comfort TEXT,
  primary_goal TEXT,
  primary_pain_point TEXT,
  secondary_pain_points_json TEXT NOT NULL DEFAULT '[]',
  water_access TEXT,
  irrigation_method TEXT,
  budget_constraint TEXT,
  labour_constraint TEXT,
  main_crops_json TEXT NOT NULL DEFAULT '[]',
  current_crop TEXT,
  current_crop_stage TEXT,
  soil_type TEXT,
  farm_story_summary TEXT,
  ai_manager_brief TEXT,
  brief_version INTEGER NOT NULL DEFAULT 1 CHECK (brief_version > 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'needs_update', 'archived')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (farmer_id, farm_id)
);

CREATE INDEX IF NOT EXISTS idx_farmer_ai_profiles_farmer
  ON farmer_ai_profiles(farmer_id, status);

CREATE INDEX IF NOT EXISTS idx_farmer_ai_profiles_farm
  ON farmer_ai_profiles(farm_id);

CREATE TABLE IF NOT EXISTS farmer_ai_memories (
  memory_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL
    CHECK (memory_type IN (
      'constraint',
      'goal',
      'crop_history',
      'pest_history',
      'water_pattern',
      'soil_pattern',
      'farmer_preference',
      'recommendation_outcome',
      'coordinator_note'
    )),
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source TEXT NOT NULL
    CHECK (source IN (
      'onboarding',
      'weekly_checkin',
      'virtual_ndani_reading',
      'ai_plan',
      'coordinator',
      'farmer_chat'
    )),
  source_id UUID,
  valid_from BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  valid_to BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_farmer_ai_memories_context
  ON farmer_ai_memories(farmer_id, farm_id, valid_to, importance DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_ai_memories_type
  ON farmer_ai_memories(farmer_id, memory_type, memory_key);

CREATE TABLE IF NOT EXISTS weekly_farm_checkins (
  checkin_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE,
  virtual_device_id UUID REFERENCES virtual_ndani_devices(virtual_device_id) ON DELETE SET NULL,
  week_start BIGINT NOT NULL,
  crop TEXT,
  crop_stage TEXT,
  soil_condition TEXT,
  plant_condition TEXT,
  pest_disease_signs TEXT,
  rain_condition TEXT,
  irrigation_done TEXT,
  farmer_biggest_worry TEXT,
  labour_or_input_constraint TEXT,
  followed_previous_advice BOOLEAN,
  observed_change TEXT,
  manual_notes TEXT,
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high')),
  created_by TEXT NOT NULL CHECK (created_by IN ('farmer', 'coordinator', 'system')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_weekly_farm_checkins_farmer_week
  ON weekly_farm_checkins(farmer_id, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_farm_checkins_farm_week
  ON weekly_farm_checkins(farm_id, week_start DESC);

CREATE TABLE IF NOT EXISTS ai_farm_plans (
  plan_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(farm_id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES weekly_farm_checkins(checkin_id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES agent_conversations(conversation_id) ON DELETE SET NULL,
  prompt_family TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  summary TEXT NOT NULL,
  main_issue TEXT,
  recommended_actions_json TEXT NOT NULL DEFAULT '[]',
  simple_explanation TEXT,
  shona_summary TEXT,
  follow_up_question TEXT,
  missing_information_json TEXT NOT NULL DEFAULT '[]',
  evidence_used_json TEXT NOT NULL DEFAULT '[]',
  safety_flags_json TEXT NOT NULL DEFAULT '[]',
  coordinator_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  raw_model_output_json TEXT,
  validation_status TEXT NOT NULL
    CHECK (validation_status IN ('valid', 'repaired', 'fallback', 'rejected')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_ai_farm_plans_farmer_created
  ON ai_farm_plans(farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_farm_plans_checkin
  ON ai_farm_plans(checkin_id);

CREATE INDEX IF NOT EXISTS idx_ai_farm_plans_review
  ON ai_farm_plans(coordinator_review_required, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_recommendation_outcomes (
  outcome_id UUID PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES ai_farm_plans(plan_id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL CHECK (action_index >= 0),
  farmer_followed BOOLEAN,
  outcome_observed TEXT,
  farmer_feedback TEXT,
  coordinator_notes TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),
  UNIQUE (plan_id, action_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendation_outcomes_farmer
  ON ai_recommendation_outcomes(farmer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_prompt_invocations (
  invocation_id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES farmers(farmer_id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(farm_id) ON DELETE SET NULL,
  prompt_family TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_token_count INTEGER CHECK (input_token_count IS NULL OR input_token_count >= 0),
  output_token_count INTEGER CHECK (output_token_count IS NULL OR output_token_count >= 0),
  estimated_cost_usd NUMERIC,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status TEXT NOT NULL CHECK (status IN ('success', 'validation_failed', 'fallback', 'error')),
  error_code TEXT,
  context_source_counts_json TEXT NOT NULL DEFAULT '{}',
  safety_flags_json TEXT NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_invocations_farmer_created
  ON ai_prompt_invocations(farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_invocations_prompt
  ON ai_prompt_invocations(prompt_family, prompt_version, created_at DESC);
