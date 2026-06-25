import assert from 'assert';
import { hashPilotPin, validatePilotPin, verifyPilotPin } from './auth/pin';
import { hashSessionToken } from './auth/session';
import {
  InvalidAgentTransitionError,
  transitionAgentState,
} from './agent/domain/stateMachine';
import {
  classifyConfidence,
  selectFollowUp,
} from './agent/domain/followUpPolicy';
import { AgentRequestError } from './agent/application/agentService';
import {
  EXTRACTION_SCHEMA_VERSION,
  decideObservationNextStep,
  parseObservationExtraction,
} from './agent/domain/observationExtraction';
import { heuristicObservationExtraction } from './agent/infrastructure/heuristicExtraction';

async function run(): Promise<void> {
  validatePilotPin('2048');
  assert.throws(() => validatePilotPin('12'), /4 to 8 digits/);
  assert.throws(() => validatePilotPin('abcd'), /4 to 8 digits/);

  const hash = await hashPilotPin('2048');
  assert.equal(await verifyPilotPin('2048', hash), true);
  assert.equal(await verifyPilotPin('2049', hash), false);
  assert.notEqual(hash, await hashPilotPin('2048'));

  assert.equal(hashSessionToken('session-a'), hashSessionToken('session-a'));
  assert.notEqual(hashSessionToken('session-a'), hashSessionToken('session-b'));

  assert.equal(
    transitionAgentState('idle', 'START_OBSERVATION').nextState,
    'collecting_observation'
  );
  assert.equal(
    transitionAgentState('collecting_observation', 'REQUIRED_FIELD_MISSING').nextState,
    'awaiting_missing_field'
  );
  assert.equal(
    transitionAgentState('awaiting_missing_field', 'FIELD_ACCEPTED').nextState,
    'collecting_observation'
  );
  assert.equal(
    transitionAgentState('collecting_observation', 'RISK_RULE_MATCHED').nextState,
    'flagged_for_coordinator'
  );
  assert.equal(
    transitionAgentState('awaiting_submission_confirmation', 'CONFIRM_SUBMIT').nextState,
    'submitted'
  );
  assert.throws(
    () => transitionAgentState('idle', 'CONFIRM_SUBMIT'),
    InvalidAgentTransitionError
  );

  assert.equal(classifyConfidence(0.8), 'accept');
  assert.equal(classifyConfidence(0.5), 'confirm');
  assert.equal(classifyConfidence(0.49), 'missing');
  assert.throws(() => classifyConfidence(1.1), /between 0 and 1/);

  assert.deepEqual(
    selectFollowUp({
      hasSafetyRisk: true,
      hasContradiction: true,
      missingRequiredFields: ['crop_type'],
      mediumConfidenceFields: ['soil_condition'],
      photoEligible: true,
      photoRequested: false,
    }),
    { decision: 'ask_risk_clarification' }
  );
  assert.deepEqual(
    selectFollowUp({
      hasSafetyRisk: false,
      hasContradiction: false,
      missingRequiredFields: ['crop_type', 'crop_stage'],
      mediumConfidenceFields: ['soil_condition'],
      photoEligible: true,
      photoRequested: false,
    }),
    { decision: 'ask_required_field', field: 'crop_type' }
  );
  assert.deepEqual(
    selectFollowUp({
      hasSafetyRisk: false,
      hasContradiction: false,
      missingRequiredFields: [],
      mediumConfidenceFields: [],
      photoEligible: false,
      photoRequested: false,
    }),
    { decision: 'confirm_submission' }
  );

  const parsed = parseObservationExtraction({
    schema_version: EXTRACTION_SCHEMA_VERSION,
    intent: 'report_observation',
    language: 'sn-en',
    fields: {
      crop_type: { value: 'maize', confidence: 0.91, evidence: 'emaize' },
    },
    risk_hints: [],
    unresolved: ['crop_stage'],
  });
  assert.equal(parsed.fields.crop_type?.value, 'maize');
  assert.throws(
    () => parseObservationExtraction({
      schema_version: EXTRACTION_SCHEMA_VERSION,
      intent: 'report_observation',
      language: 'en',
      fields: {
        unexpected_field: { value: 'anything', confidence: 1, evidence: 'anything' },
      },
      risk_hints: [],
      unresolved: [],
    }),
    /unknown extraction field/
  );

  const mixedLanguage = heuristicObservationExtraction({
    farmerMessage: 'Mashizha emaize ari kuoma',
    currentDraft: {},
  });
  assert.equal(mixedLanguage.fields.crop_type?.value, 'maize');
  assert.equal(mixedLanguage.fields.plant_condition?.value, 'poor');
  assert.equal(
    heuristicObservationExtraction({
      farmerMessage: 'The plants look good',
      currentDraft: {},
    }).fields.plant_condition?.value,
    'good'
  );
  assert.equal(
    heuristicObservationExtraction({
      farmerMessage: 'good',
      currentDraft: {},
      pendingField: 'plant_condition',
    }).fields.plant_condition?.value,
    'good'
  );
  assert.equal(
    heuristicObservationExtraction({
      farmerMessage: 'The maize is flowering',
      currentDraft: {},
    }).fields.crop_stage?.value,
    'flowering'
  );
  assert.equal(
    heuristicObservationExtraction({
      farmerMessage: 'I did not irrigate',
      currentDraft: {},
    }).fields.irrigated_today?.value,
    'no'
  );

  const mediumConfidence = decideObservationNextStep({
    currentDraft: {
      crop_type: 'maize',
      crop_stage: 'vegetative',
      rain_level: 'light',
      soil_condition: 'moist',
      pest_or_disease_signs: 'none',
      irrigated_today: 'no',
    },
    currentConfidence: {},
    extraction: {
      schema_version: EXTRACTION_SCHEMA_VERSION,
      intent: 'answer_follow_up',
      language: 'en',
      fields: {
        plant_condition: { value: 'fair', confidence: 0.65, evidence: 'fair' },
      },
      risk_hints: [],
      unresolved: [],
    },
  });
  assert.equal(mediumConfidence.event, 'FIELD_REQUIRES_CONFIRMATION');
  assert.equal(mediumConfidence.selectedField, 'plant_condition');
  assert.equal(mediumConfidence.selectedValue, 'fair');
  assert.equal(mediumConfidence.draft.plant_condition, undefined);

  const confirmed = heuristicObservationExtraction({
    farmerMessage: 'hongu',
    currentDraft: mediumConfidence.draft,
    pendingField: mediumConfidence.selectedField,
    pendingValue: mediumConfidence.selectedValue,
  });
  assert.equal(confirmed.fields.plant_condition?.value, 'fair');
  assert.equal(confirmed.fields.plant_condition?.confidence, 1);

  const malformedFarmError = new AgentRequestError('farm_not_found', 404);
  assert.equal(malformedFarmError.status, 404);

  console.log('Agent foundation tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
