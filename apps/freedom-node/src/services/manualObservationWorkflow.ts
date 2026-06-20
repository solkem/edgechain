import crypto from 'crypto';
import { manualObservationDB } from '../database';
import {
  ManualObservationChannel,
  ManualObservationDraft,
  ManualObservationRecord,
  ManualObservationReply,
  ManualObservationSession,
  ManualObservationStep,
} from '../types/manualObservation';
import {
  formatManualObservationSummary,
  MANUAL_OBSERVATION_OPTIONS,
  normalizeChoice,
  validateManualObservation,
} from './manualObservationValidation';

const STEP_ORDER: ManualObservationStep[] = [
  'site_id',
  'crop_type',
  'crop_stage',
  'rain_level',
  'soil_condition',
  'plant_condition',
  'pest_or_disease_signs',
  'irrigated_today',
  'photo',
  'notes',
  'confirm',
];

type ChoiceField = Exclude<keyof typeof MANUAL_OBSERVATION_OPTIONS, never>;

export class ManualObservationWorkflow {
  async startSession(params: {
    channel: ManualObservationChannel;
    participant_phone?: string;
  }): Promise<ManualObservationReply> {
    const participant_phone_hash = params.participant_phone
      ? this.hashPhone(params.participant_phone)
      : undefined;
    const session: ManualObservationSession = {
      session_id: crypto.randomUUID(),
      channel: params.channel,
      participant_phone_hash,
      current_step: 'site_id',
      status: 'active',
      draft: {},
    };

    await manualObservationDB.insertSession(session);
    return {
      session,
      prompt: this.promptForStep('site_id'),
    };
  }

  async continueSession(session_id: string, input: string): Promise<ManualObservationReply> {
    const session = await manualObservationDB.findSession(session_id);
    if (!session) {
      throw new Error('manual observation session not found');
    }
    return this.applyInput(session, input);
  }

  async continueOrStartWhatsAppSession(phone: string, input: string): Promise<ManualObservationReply> {
    const phoneHash = this.hashPhone(phone);
    const existing = await manualObservationDB.findActiveSessionByPhoneHash(phoneHash);
    const session = existing || (await this.startSession({ channel: 'whatsapp', participant_phone: phone })).session;

    await manualObservationDB.insertMessage({
      session_id: session.session_id,
      channel: 'whatsapp',
      direction: 'inbound',
      participant_phone_hash: phoneHash,
      raw_payload: { text: input },
    });

    const reply = await this.applyInput(session, input);
    await manualObservationDB.insertMessage({
      session_id: reply.session.session_id,
      channel: 'whatsapp',
      direction: 'outbound',
      participant_phone_hash: phoneHash,
      raw_payload: { text: reply.prompt },
    });
    return reply;
  }

  async listObservations(limit = 100): Promise<ManualObservationRecord[]> {
    return manualObservationDB.listObservations(limit);
  }

  schema() {
    return {
      required_fields: [
        'site_id',
        'crop_type',
        'crop_stage',
        'rain_level',
        'soil_condition',
        'plant_condition',
        'pest_or_disease_signs',
        'irrigated_today',
      ],
      optional_fields: ['photo_status', 'notes'],
      options: MANUAL_OBSERVATION_OPTIONS,
    };
  }

  hashPhone(phone: string): string {
    const salt = process.env.MANUAL_OBSERVATION_PHONE_SALT || 'edgechain-pilot-local-salt';
    return crypto.createHash('sha256').update(`${salt}:${phone}`).digest('hex');
  }

  private async applyInput(session: ManualObservationSession, input: string): Promise<ManualObservationReply> {
    if (session.status !== 'active') {
      return { session, prompt: 'This observation session is already closed. Start a new session to submit another observation.' };
    }

    const trimmed = input.trim();
    if (trimmed.toUpperCase() === 'CANCEL') {
      session.status = 'cancelled';
      await manualObservationDB.updateSession(session);
      return { session, prompt: 'Observation cancelled. Start a new session when you are ready.' };
    }

    if (trimmed.toUpperCase() === 'EDIT') {
      session.current_step = 'site_id';
      session.draft = {};
      await manualObservationDB.updateSession(session);
      return { session, prompt: this.promptForStep(session.current_step) };
    }

    if (session.current_step === 'confirm') {
      if (['YES', 'Y', 'SUBMIT'].includes(trimmed.toUpperCase())) {
        const observation = await this.submit(session);
        return {
          session: { ...session, status: 'submitted', current_step: 'submitted' },
          observation,
          prompt: `Observation submitted. Validation status: ${observation.validation_status}.`,
        };
      }
      return { session, prompt: 'Reply YES to submit, EDIT to restart, or CANCEL to stop.' };
    }

    const error = this.applyStepValue(session.draft, session.current_step, trimmed);
    if (error) {
      return { session, prompt: `${error}\n\n${this.promptForStep(session.current_step)}` };
    }

    session.current_step = this.nextStep(session.current_step);
    await manualObservationDB.updateSession(session);

    if (session.current_step === 'confirm') {
      return { session, prompt: formatManualObservationSummary(session.draft) };
    }

    return { session, prompt: this.promptForStep(session.current_step) };
  }

  private applyStepValue(draft: ManualObservationDraft, step: ManualObservationStep, input: string): string | undefined {
    switch (step) {
      case 'site_id':
        draft.site_id = input.toLowerCase();
        return /^site-\d{3}$/i.test(input) ? undefined : 'Site ID must look like site-001.';
      case 'crop_type':
      case 'crop_stage':
      case 'rain_level':
      case 'soil_condition':
      case 'plant_condition':
      case 'pest_or_disease_signs':
      case 'irrigated_today':
        return this.applyChoice(draft, step, input);
      case 'photo':
        draft.photo_status = normalizeChoice(input) === 'attached' || normalizeChoice(input) === 'yes' ? 'attached' : 'skipped';
        return undefined;
      case 'notes':
        draft.notes = ['skip', 'none', 'no'].includes(normalizeChoice(input)) ? undefined : input.slice(0, 500);
        return undefined;
      default:
        return undefined;
    }
  }

  private applyChoice(draft: ManualObservationDraft, field: ChoiceField, input: string): string | undefined {
    const options = MANUAL_OBSERVATION_OPTIONS[field];
    const normalized = normalizeChoice(input);
    const numericIndex = Number.parseInt(normalized, 10);
    const value = Number.isInteger(numericIndex) && numericIndex >= 1
      ? options[numericIndex - 1]
      : options.find(option => option === normalized);

    if (!value) {
      return `Invalid ${field}. Choose one of: ${options.join(', ')}.`;
    }

    (draft as any)[field] = value;
    return undefined;
  }

  private nextStep(step: ManualObservationStep): ManualObservationStep {
    const idx = STEP_ORDER.indexOf(step);
    return STEP_ORDER[idx + 1] || 'confirm';
  }

  private promptForStep(step: ManualObservationStep): string {
    switch (step) {
      case 'site_id':
        return 'What site are you reporting for? Example: site-004';
      case 'crop_type':
        return this.numberedPrompt('Which crop are you reporting?', MANUAL_OBSERVATION_OPTIONS.crop_type);
      case 'crop_stage':
        return this.numberedPrompt('What crop stage is this?', MANUAL_OBSERVATION_OPTIONS.crop_stage);
      case 'rain_level':
        return this.numberedPrompt('Rain today?', MANUAL_OBSERVATION_OPTIONS.rain_level);
      case 'soil_condition':
        return this.numberedPrompt('How does the soil look or feel?', MANUAL_OBSERVATION_OPTIONS.soil_condition);
      case 'plant_condition':
        return this.numberedPrompt('How do the plants look?', MANUAL_OBSERVATION_OPTIONS.plant_condition);
      case 'pest_or_disease_signs':
        return this.numberedPrompt('Any pest or disease signs?', MANUAL_OBSERVATION_OPTIONS.pest_or_disease_signs);
      case 'irrigated_today':
        return this.numberedPrompt('Did you irrigate today?', MANUAL_OBSERVATION_OPTIONS.irrigated_today);
      case 'photo':
        return 'Attach a photo if available, or reply SKIP.';
      case 'notes':
        return 'Any notes? Reply SKIP if none.';
      default:
        return 'Reply YES to submit, EDIT to restart, or CANCEL to stop.';
    }
  }

  private numberedPrompt(question: string, options: readonly string[]): string {
    return [
      question,
      ...options.map((option, idx) => `${idx + 1}. ${option}`),
    ].join('\n');
  }

  private async submit(session: ManualObservationSession): Promise<ManualObservationRecord> {
    const validation = validateManualObservation(session.draft);
    const observation: ManualObservationRecord = {
      observation_id: crypto.randomUUID(),
      session_id: session.session_id,
      site_id: session.draft.site_id || 'unknown',
      channel: session.channel,
      participant_phone_hash: session.participant_phone_hash,
      observation_date: new Date().toISOString().slice(0, 10),
      payload: session.draft,
      validation_status: validation.status,
      validation_errors: validation.errors,
      review_status: validation.status === 'flagged' ? 'needs_followup' : 'pending',
      submitted_at: Math.floor(Date.now() / 1000),
    };

    await manualObservationDB.insertObservation(observation);
    session.status = 'submitted';
    session.current_step = 'submitted';
    await manualObservationDB.updateSession(session);
    return observation;
  }
}

export const manualObservationWorkflow = new ManualObservationWorkflow();
