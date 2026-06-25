export type FollowUpDecision =
  | 'ask_risk_clarification'
  | 'resolve_contradiction'
  | 'ask_required_field'
  | 'confirm_medium_confidence_field'
  | 'offer_optional_photo'
  | 'confirm_submission';

export interface FollowUpFacts {
  hasSafetyRisk: boolean;
  hasContradiction: boolean;
  missingRequiredFields: string[];
  mediumConfidenceFields: string[];
  photoEligible: boolean;
  photoRequested: boolean;
}

export function selectFollowUp(facts: FollowUpFacts): {
  decision: FollowUpDecision;
  field?: string;
} {
  if (facts.hasSafetyRisk) {
    return { decision: 'ask_risk_clarification' };
  }
  if (facts.hasContradiction) {
    return { decision: 'resolve_contradiction' };
  }
  if (facts.missingRequiredFields.length > 0) {
    return {
      decision: 'ask_required_field',
      field: facts.missingRequiredFields[0],
    };
  }
  if (facts.mediumConfidenceFields.length > 0) {
    return {
      decision: 'confirm_medium_confidence_field',
      field: facts.mediumConfidenceFields[0],
    };
  }
  if (facts.photoEligible && !facts.photoRequested) {
    return { decision: 'offer_optional_photo' };
  }
  return { decision: 'confirm_submission' };
}

export function classifyConfidence(confidence: number): 'accept' | 'confirm' | 'missing' {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence must be between 0 and 1');
  }
  if (confidence >= 0.8) return 'accept';
  if (confidence >= 0.5) return 'confirm';
  return 'missing';
}
