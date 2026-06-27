export interface PilotFarmer {
  farmer_id: string;
  pilot_code: string;
  display_name: string;
  preferred_language: string;
  system_role: 'farmer' | 'coordinator';
}

export interface PilotFarm {
  farm_id: string;
  site_id: string;
  display_name: string;
  role: 'owner' | 'manager' | 'observer';
  status: string;
}

export interface PilotSession {
  authenticated: true;
  farmer: PilotFarmer;
  farms: PilotFarm[];
}

export interface CoordinatorFleetDevice {
  virtual_device_id: string;
  device_code: string;
  site_id: string;
  mode: string;
  status: string;
  future_physical_interval_minutes: number;
  physical_device_pubkey: string | null;
  physical_bound_at: number | null;
  physical_binding_version: string | null;
  farm_id: string;
  farm_display_name: string;
  farmer_display_name: string | null;
  latest_reading_id: string | null;
  latest_quality_status: string | null;
  latest_collection_mode: string | null;
  latest_observed_at: number | null;
  flagged_reading_count: number;
  contribution_count: number;
  current_cycle_id: string | null;
  current_cycle_status: string | null;
  current_due_at: number | null;
  missed_cycle_count: number;
  average_manual_minutes: number;
}

export interface CoordinatorFarmer {
  farmer_id: string;
  pilot_code: string;
  display_name: string;
  preferred_language: 'en' | 'sn' | 'sn-en';
  status: 'active' | 'suspended' | 'withdrawn';
  created_at: number;
  farm_id: string | null;
  site_id: string | null;
  farm_display_name: string | null;
  virtual_device_id: string | null;
  device_code: string | null;
  device_status: string | null;
  last_used_at: number | null;
  failed_attempts: number;
  locked_until: number | null;
  active_sessions: number;
  gemini_input_tokens: number;
  gemini_output_tokens: number;
  gemini_estimated_cost_usd: number;
  gemini_request_count: number;
}

export interface FarmerAiProfile {
  profile_id: string;
  farmer_id: string;
  farm_id: string | null;
  preferred_language: 'en' | 'sn' | 'sn-en';
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
  status: 'draft' | 'active' | 'needs_update' | 'archived';
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
  soil_condition: 'very_dry' | 'dry' | 'moist' | 'wet' | 'waterlogged' | null;
  plant_condition: 'good' | 'fair' | 'poor' | null;
  pest_disease_signs: 'none' | 'some' | 'severe' | null;
  rain_condition: 'no_recent_rain' | 'light_recent_rain' | 'heavy_recent_rain' | null;
  irrigation_done: 'yes' | 'no' | 'not_needed' | null;
  farmer_biggest_worry: string | null;
  labour_or_input_constraint: string | null;
  followed_previous_advice: boolean | null;
  observed_change: string | null;
  manual_notes: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  created_by: 'farmer' | 'coordinator' | 'system';
  created_at: number;
  updated_at: number;
}

export interface WeeklyFarmCheckinDraft {
  farm_id: string;
  crop: string;
  crop_stage: string;
  soil_condition: NonNullable<WeeklyFarmCheckin['soil_condition']>;
  plant_condition: NonNullable<WeeklyFarmCheckin['plant_condition']>;
  pest_disease_signs: NonNullable<WeeklyFarmCheckin['pest_disease_signs']>;
  rain_condition: NonNullable<WeeklyFarmCheckin['rain_condition']>;
  irrigation_done: NonNullable<WeeklyFarmCheckin['irrigation_done']>;
  farmer_biggest_worry: string;
  labour_or_input_constraint: string;
  followed_previous_advice: boolean | null;
  observed_change: string;
  manual_notes: string;
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
  risk_level: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  main_issue: string | null;
  recommended_actions: FarmManagerRecommendedAction[];
  simple_explanation: string | null;
  shona_summary: string | null;
  follow_up_question: string | null;
  missing_information: string[];
  evidence_used: Array<{
    type: 'profile' | 'memory' | 'checkin' | 'ndani_reading' | 'previous_plan' | 'playbook';
    id: string;
    summary: string;
  }>;
  safety_flags: string[];
  coordinator_review_required: boolean;
  raw_model_output: Record<string, unknown> | null;
  validation_status: 'valid' | 'repaired' | 'fallback' | 'rejected';
  created_at: number;
}

export interface PilotOperationsMetrics {
  devices: number;
  total_cycles: number;
  completed_cycles: number;
  missed_cycles: number;
  scheduled_cycles: number;
  active_cycles: number;
  completion_rate: number;
  average_manual_minutes: number;
  total_manual_hours: number;
  total_coordinator_hours: number;
  projected_physical_readings_per_day: number;
  projected_temporal_coverage_multiplier: number;
  unavailable_hardware_channel_instances: number;
}

export interface PilotEvidenceReport {
  report_version: string;
  generated_at: number;
  scope: string;
  truth_statement: string;
  methodology: {
    pilot_manual_cadence: string;
    physical_projection: string;
    identity_policy: string;
    synthetic_demo_records_included: false;
  };
  summary: PilotOperationsMetrics;
  fleet: Array<{
    device_code: string;
    site_id: string;
    mode: string;
    total_cycles: number;
    completed_cycles: number;
    missed_cycles: number;
    completion_rate: number;
    average_manual_minutes: number;
    total_manual_hours: number;
    total_coordinator_hours: number;
    projected_physical_readings_per_day: number;
    projected_temporal_coverage_multiplier: number;
  }>;
  channels: Array<{
    channel_key: string;
    field_count: number;
    unavailable_count: number;
    observed_count: number;
    measured_count: number;
    manual_proxy_count: number;
    physical_sensor_count: number;
    external_context_count: number;
    derived_count: number;
  }>;
  research: {
    accepted_readings: number;
    flagged_readings: number;
    excluded_readings: number;
    model_ready_batches: number;
    eligible_features: number;
    excluded_features: number;
    features_used_in_training: number;
    manual_readings_without_device_proof: number;
    model_training_completed: boolean;
  };
}

export interface CoordinatorReadingReview extends VirtualNdaniReading {
  device_code: string;
  site_id: string;
  farm_display_name: string;
  farmer_display_name: string | null;
  context: Record<string, unknown>;
}

export interface AgentDecision {
  event: string;
  previous_state: string;
  next_state: string;
  rule_version: string;
  reason: string;
}

export interface AgentMessageResponse {
  success: true;
  duplicate: boolean;
  conversation: {
    conversation_id: string;
    farm_id: string;
    state: string;
    status: string;
    version: number;
  };
  decision: AgentDecision;
  reply: string;
  virtual_ndani?: {
    virtual_device_id: string;
    device_code: string;
    reading_id: string;
    quality_status: 'accepted' | 'flagged';
    coordinator_review_required: boolean;
    model_ready: boolean;
    eligible_feature_count: number;
  };
}

export interface FarmManagerChatReply {
  answer: string;
  shona_summary: string | null;
  recommended_next_step: string | null;
  missing_information: string[];
  evidence_used: Array<{
    type: 'profile' | 'memory' | 'checkin' | 'ndani_reading' | 'previous_plan' | 'playbook';
    id: string;
    summary: string;
  }>;
  confidence: 'low' | 'medium' | 'high';
  coordinator_review_required: boolean;
  safety_flags: string[];
  provider: string;
  model: string;
  validation_status: 'valid' | 'fallback';
}

export interface FarmManagerChatResponse {
  success: true;
  reply: FarmManagerChatReply;
}

export interface AgentConversationResponse {
  success: true;
  conversation: AgentMessageResponse['conversation'];
  messages: Array<{
    message_id: string;
    direction: 'inbound' | 'outbound';
    text: string;
    created_at: number;
  }>;
}

export interface AgentChatMessage {
  id: string;
  sender: 'farmer' | 'agent';
  text: string;
  createdAt: Date;
}

export interface VirtualNdaniChannel {
  channel_key: string;
  display_name: string;
  pilot_source_policy: string;
  future_sensor_type: string | null;
  future_unit: string | null;
  display_order: number;
  enabled: boolean;
  physical_collection_enabled: boolean;
  current: {
    value: unknown;
    measurement_kind: 'measured' | 'observed' | 'derived' | 'unavailable';
    source_class:
      | 'physical_sensor'
      | 'manual_proxy'
      | 'external_context'
      | 'derived'
      | 'synthetic_demo'
      | null;
    label: string;
  };
}

export interface VirtualNdaniDevice {
  virtual_device_id: string;
  device_code: string;
  farm_id: string;
  farm_display_name: string;
  site_id: string;
  mode: 'human_assisted_pilot' | 'physical_bound';
  status: string;
  firmware_profile: string;
  physical_device_pubkey: string | null;
  physical_bound_at: number | null;
  physical_binding_version: string | null;
  expected_interval_minutes: number;
  future_physical_interval_minutes: number;
  current_cycle_id: string | null;
  current_cycle_status: string | null;
  current_collection_mode: string | null;
  scheduled_for: number | null;
  due_at: number | null;
  human_assisted: boolean;
  latest_reading: VirtualNdaniReading | null;
  latest_contribution: VirtualNdaniContribution | null;
  operations: {
    total_cycles: number;
    completed_cycles: number;
    missed_cycles: number;
    completion_rate: number;
    average_manual_minutes: number;
    current_due_at: number | null;
    last_missed_at: number | null;
  };
  channels: VirtualNdaniChannel[];
  automation: {
    pilot_interval_minutes: number;
    future_physical_interval_minutes: number;
    future_readings_per_day: number;
  };
}

export interface VirtualNdaniFeatureDecision {
  channel_key: string;
  feature_key: string | null;
  source_class: string | null;
  measurement_kind: string;
  confidence: number | null;
  decision: 'eligible' | 'excluded';
  reason: string;
  transformation_version: string | null;
  training_run_id: string | null;
}

export interface VirtualNdaniPipelineStage {
  stage: string;
  execution_kind: 'real' | 'simulated' | 'pending' | 'not_applicable';
  status: string;
  detail: Record<string, unknown>;
  created_at: number;
}

export interface VirtualNdaniContribution {
  batch_id: string;
  status: 'model_ready';
  execution_kind: 'real';
  reading_count: number;
  eligible_feature_count: number;
  excluded_feature_count: number;
  quality_summary: {
    quality_status: string;
    model_ready_definition: string;
    model_training_completed: boolean;
    proof_verified: boolean;
    reward_paid: boolean;
  };
  policy_version: string;
  opened_at: number;
  closed_at: number | null;
  reading_id: string;
  collection_mode: string;
  observed_at: number;
  confirmed_at: number | null;
  features: VirtualNdaniFeatureDecision[];
  stages: VirtualNdaniPipelineStage[];
}

export interface VirtualNdaniCycle {
  cycle_id: string;
  virtual_device_id: string;
  status: string;
  collection_mode: string;
  scheduled_for: number;
  due_at: number;
  started_at: number | null;
}

export interface VirtualNdaniReadingField {
  channel_key: string;
  value: string | null;
  unit: string | null;
  measurement_kind: 'measured' | 'observed' | 'derived' | 'unavailable';
  source_class:
    | 'physical_sensor'
    | 'manual_proxy'
    | 'external_context'
    | 'derived'
    | null;
  source_reference: string | null;
  confidence: number | null;
  evidence: string | null;
  review_status: 'pending' | 'accepted' | 'needs_followup';
}

export interface VirtualNdaniReading {
  reading_id: string;
  virtual_device_id: string;
  cycle_id: string;
  farmer_id: string | null;
  farm_id: string;
  collection_mode: string;
  observed_at: number;
  recorded_at: number;
  confirmed_at: number | null;
  quality_status: 'awaiting_confirmation' | 'accepted' | 'flagged' | 'cancelled';
  risk_flags: string[];
  notes: string | null;
  fields: VirtualNdaniReadingField[];
}

export interface GuidedReadingDraft {
  soil_moisture: 'very_dry' | 'dry' | 'moist' | 'wet' | 'waterlogged';
  rain_condition: 'none' | 'light' | 'moderate' | 'heavy';
  plant_condition: 'good' | 'fair' | 'poor';
  pest_disease_signs: 'none' | 'some' | 'severe';
  irrigation: 'yes' | 'no' | 'unknown';
  notes?: string;
}

export interface VirtualNdaniEvent {
  pipeline_event_id: string;
  cycle_id: string | null;
  stage: string;
  execution_kind: 'real' | 'simulated' | 'pending' | 'not_applicable';
  status: string;
  detail: Record<string, unknown>;
  created_at: number;
}

export interface PhysicalManualComparison {
  comparison_version: string;
  interpretation: string;
  latest_physical: {
    reading_id: string;
    observed_at: number;
    temperature: number;
    humidity: number;
    soil_moisture: number;
  } | null;
  latest_human: {
    reading_id: string;
    observed_at: number;
    soil_moisture?: string;
    plant_condition?: string;
    pest_disease_signs?: string;
  } | null;
  coverage: {
    physical_readings: number;
    human_readings: number;
    first_physical_at: number | null;
    last_physical_at: number | null;
  };
}

export interface PhysicalNdaniDemoEvent {
  demo_event_id: string;
  sequence_number: number;
  stage: string;
  execution_kind: 'simulated';
  status: string;
  synthetic_values: {
    minute?: number;
    temperature?: number;
    humidity?: number;
    soil_moisture?: number;
  };
  explanation: string;
  offset_seconds: number;
}

export interface PhysicalNdaniDemoSession {
  demo_session_id: string;
  virtual_device_id: string;
  device_code: string;
  status: 'complete';
  demo_version: string;
  expires_at: number;
  demonstration_data: true;
  non_evidentiary: true;
  disclaimer: string;
  events: PhysicalNdaniDemoEvent[];
}

export interface PhysicalBindingChallenge {
  challenge_id: string;
  virtual_device_id: string;
  device_code: string;
  device_pubkey: string;
  challenge: string;
  signature_algorithm: 'ECDSA_P256_SHA256_IEEE_P1363';
  expires_at: number;
}

export interface PhysicalBindingResult {
  virtual_device_id: string;
  mode: 'physical_bound';
  physical_device_pubkey: string;
  physical_bound_at: number;
  physical_channels_enabled: string[];
  historical_manual_readings_preserved: true;
}
