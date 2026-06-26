export type FarmManagerLanguage = 'en' | 'sn' | 'sn-en';
export type FarmManagerProfileStatus = 'draft' | 'active' | 'needs_update' | 'archived';
export type FarmManagerRiskLevel = 'low' | 'medium' | 'high';
export type FarmManagerConfidence = 'low' | 'medium' | 'high';
export type FarmManagerValidationStatus = 'valid' | 'repaired' | 'fallback' | 'rejected';
export type FarmManagerPromptStatus = 'success' | 'validation_failed' | 'fallback' | 'error';

export type FarmManagerMemoryType =
  | 'constraint'
  | 'goal'
  | 'crop_history'
  | 'pest_history'
  | 'water_pattern'
  | 'soil_pattern'
  | 'farmer_preference'
  | 'recommendation_outcome'
  | 'coordinator_note';

export type FarmManagerMemorySource =
  | 'onboarding'
  | 'weekly_checkin'
  | 'virtual_ndani_reading'
  | 'ai_plan'
  | 'coordinator'
  | 'farmer_chat';

export type WeeklyCheckinCreatedBy = 'farmer' | 'coordinator' | 'system';

export interface FarmerAiProfile {
  profile_id: string;
  farmer_id: string;
  farm_id: string | null;
  preferred_language: FarmManagerLanguage;
  literacy_level: string | null;
  technology_comfort: string | null;
  primary_goal: string | null;
  primary_pain_point: string | null;
  secondary_pain_points: string[];
  water_access: string | null;
  irrigation_method: string | null;
  budget_constraint: string | null;
  labour_constraint: string | null;
  main_crops: string[];
  current_crop: string | null;
  current_crop_stage: string | null;
  soil_type: string | null;
  farm_story_summary: string | null;
  ai_manager_brief: string | null;
  brief_version: number;
  status: FarmManagerProfileStatus;
  created_at: number;
  updated_at: number;
}

export interface FarmerAiMemory {
  memory_id: string;
  farmer_id: string;
  farm_id: string | null;
  memory_type: FarmManagerMemoryType;
  memory_key: string;
  memory_value: string;
  importance: number;
  source: FarmManagerMemorySource;
  source_id: string | null;
  valid_from: number;
  valid_to: number | null;
  created_at: number;
  updated_at: number;
}

export interface WeeklyFarmCheckin {
  checkin_id: string;
  farmer_id: string;
  farm_id: string | null;
  virtual_device_id: string | null;
  week_start: number;
  crop: string | null;
  crop_stage: string | null;
  soil_condition: string | null;
  plant_condition: string | null;
  pest_disease_signs: string | null;
  rain_condition: string | null;
  irrigation_done: string | null;
  farmer_biggest_worry: string | null;
  labour_or_input_constraint: string | null;
  followed_previous_advice: boolean | null;
  observed_change: string | null;
  manual_notes: string | null;
  risk_level: FarmManagerRiskLevel | null;
  created_by: WeeklyCheckinCreatedBy;
  created_at: number;
  updated_at: number;
}

export interface FarmManagerRecommendedAction {
  priority: number;
  title: string;
  action: string;
  reason: string;
  timeframe: string;
  cost_level: 'none' | 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'moderate' | 'difficult';
  shona_phrase?: string;
}

export interface FarmManagerEvidenceUsed {
  type: 'profile' | 'memory' | 'checkin' | 'ndani_reading' | 'previous_plan' | 'playbook';
  id: string;
  summary: string;
}

export interface AiFarmPlan {
  plan_id: string;
  farmer_id: string;
  farm_id: string | null;
  checkin_id: string | null;
  conversation_id: string | null;
  prompt_family: string;
  prompt_version: string;
  model_provider: string;
  model_name: string;
  risk_level: FarmManagerRiskLevel;
  confidence: FarmManagerConfidence;
  summary: string;
  main_issue: string | null;
  recommended_actions: FarmManagerRecommendedAction[];
  simple_explanation: string | null;
  shona_summary: string | null;
  follow_up_question: string | null;
  missing_information: string[];
  evidence_used: FarmManagerEvidenceUsed[];
  safety_flags: string[];
  coordinator_review_required: boolean;
  raw_model_output: Record<string, unknown> | null;
  validation_status: FarmManagerValidationStatus;
  created_at: number;
}

export interface AiRecommendationOutcome {
  outcome_id: string;
  plan_id: string;
  farmer_id: string;
  action_index: number;
  farmer_followed: boolean | null;
  outcome_observed: string | null;
  farmer_feedback: string | null;
  coordinator_notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface AiPromptInvocation {
  invocation_id: string;
  farmer_id: string | null;
  farm_id: string | null;
  prompt_family: string;
  prompt_version: string;
  model_provider: string;
  model_name: string;
  input_token_count: number | null;
  output_token_count: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  status: FarmManagerPromptStatus;
  error_code: string | null;
  context_source_counts: Record<string, number>;
  safety_flags: string[];
  created_at: number;
}
