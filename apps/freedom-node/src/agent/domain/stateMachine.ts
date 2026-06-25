export const AGENT_RULE_VERSION = 'agent-state-v1';

export type AgentState =
  | 'idle'
  | 'collecting_observation'
  | 'awaiting_missing_field'
  | 'awaiting_field_confirmation'
  | 'awaiting_risk_clarification'
  | 'awaiting_photo_optional'
  | 'awaiting_submission_confirmation'
  | 'submitted'
  | 'flagged_for_coordinator'
  | 'cancelled';

export type AgentEvent =
  | 'START_OBSERVATION'
  | 'TEXT_RECEIVED'
  | 'PHOTO_RECEIVED'
  | 'VOICE_RECEIVED'
  | 'FIELD_ACCEPTED'
  | 'FIELD_REQUIRES_CONFIRMATION'
  | 'REQUIRED_FIELD_MISSING'
  | 'CONTRADICTION_FOUND'
  | 'RISK_RULE_MATCHED'
  | 'REQUEST_OPTIONAL_PHOTO'
  | 'READY_FOR_CONFIRMATION'
  | 'CONFIRM_SUBMIT'
  | 'EDIT'
  | 'CANCEL'
  | 'COORDINATOR_REVIEWED'
  | 'TIMEOUT';

export interface AgentTransition {
  previousState: AgentState;
  event: AgentEvent;
  nextState: AgentState;
  reason: string;
  ruleVersion: string;
}

const CLOSED_STATES: AgentState[] = ['submitted', 'cancelled'];

export function transitionAgentState(
  currentState: AgentState,
  event: AgentEvent
): AgentTransition {
  const nextState = resolveNextState(currentState, event);
  return {
    previousState: currentState,
    event,
    nextState,
    reason: `${currentState}:${event}->${nextState}`,
    ruleVersion: AGENT_RULE_VERSION,
  };
}

function resolveNextState(currentState: AgentState, event: AgentEvent): AgentState {
  if (event === 'CANCEL') return 'cancelled';
  if (event === 'RISK_RULE_MATCHED') return 'flagged_for_coordinator';
  if (event === 'CONTRADICTION_FOUND') return 'awaiting_risk_clarification';
  if (event === 'REQUIRED_FIELD_MISSING') return 'awaiting_missing_field';
  if (event === 'FIELD_REQUIRES_CONFIRMATION') return 'awaiting_field_confirmation';
  if (event === 'REQUEST_OPTIONAL_PHOTO') return 'awaiting_photo_optional';
  if (event === 'READY_FOR_CONFIRMATION') return 'awaiting_submission_confirmation';

  if (currentState === 'idle' && event === 'START_OBSERVATION') {
    return 'collecting_observation';
  }
  if (
    currentState === 'flagged_for_coordinator' &&
    event === 'COORDINATOR_REVIEWED'
  ) {
    return 'collecting_observation';
  }
  if (event === 'EDIT') {
    return 'collecting_observation';
  }
  if (
    currentState === 'awaiting_submission_confirmation' &&
    event === 'CONFIRM_SUBMIT'
  ) {
    return 'submitted';
  }
  if (
    ['awaiting_missing_field', 'awaiting_field_confirmation', 'awaiting_risk_clarification']
      .includes(currentState) &&
    event === 'FIELD_ACCEPTED'
  ) {
    return 'collecting_observation';
  }
  if (
    currentState === 'awaiting_photo_optional' &&
    ['PHOTO_RECEIVED', 'FIELD_ACCEPTED'].includes(event)
  ) {
    return 'collecting_observation';
  }
  if (
    currentState === 'collecting_observation' &&
    ['TEXT_RECEIVED', 'PHOTO_RECEIVED', 'VOICE_RECEIVED', 'FIELD_ACCEPTED'].includes(event)
  ) {
    return 'collecting_observation';
  }
  if (event === 'TIMEOUT' && !CLOSED_STATES.includes(currentState)) {
    return currentState;
  }

  throw new InvalidAgentTransitionError(currentState, event);
}

export class InvalidAgentTransitionError extends Error {
  constructor(
    public readonly currentState: AgentState,
    public readonly event: AgentEvent
  ) {
    super(`Invalid agent transition: ${currentState} + ${event}`);
  }
}
