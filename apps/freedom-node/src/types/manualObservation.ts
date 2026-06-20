export type ManualObservationChannel = 'whatsapp' | 'coordinator' | 'api';

export type ManualObservationStep =
  | 'site_id'
  | 'crop_type'
  | 'crop_stage'
  | 'rain_level'
  | 'soil_condition'
  | 'plant_condition'
  | 'pest_or_disease_signs'
  | 'irrigated_today'
  | 'photo'
  | 'notes'
  | 'confirm'
  | 'submitted';

export type ManualObservationStatus = 'active' | 'submitted' | 'cancelled';
export type ValidationStatus = 'valid' | 'flagged' | 'invalid';
export type ReviewStatus = 'pending' | 'reviewed' | 'needs_followup';

export interface ManualObservationDraft {
  site_id?: string;
  crop_type?: 'horticulture' | 'maize' | 'tobacco';
  crop_stage?: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest' | 'off_season';
  rain_level?: 'none' | 'light' | 'moderate' | 'heavy';
  soil_condition?: 'very_dry' | 'dry' | 'moist' | 'wet' | 'waterlogged';
  plant_condition?: 'good' | 'fair' | 'poor';
  pest_or_disease_signs?: 'none' | 'some' | 'severe';
  irrigated_today?: 'yes' | 'no' | 'unknown';
  photo_status?: 'attached' | 'skipped';
  notes?: string;
}

export interface ManualObservationSession {
  session_id: string;
  channel: ManualObservationChannel;
  participant_phone_hash?: string;
  current_step: ManualObservationStep;
  status: ManualObservationStatus;
  draft: ManualObservationDraft;
  created_at?: number;
  updated_at?: number;
}

export interface ManualObservationRecord {
  observation_id: string;
  session_id: string;
  site_id: string;
  channel: ManualObservationChannel;
  participant_phone_hash?: string;
  observation_date: string;
  payload: ManualObservationDraft;
  validation_status: ValidationStatus;
  validation_errors: string[];
  review_status: ReviewStatus;
  submitted_at: number;
}

export interface ManualObservationReply {
  session: ManualObservationSession;
  prompt: string;
  observation?: ManualObservationRecord;
}
