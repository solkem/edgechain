import {
  ObservationExtraction,
  ObservationField,
} from '../domain/observationExtraction';
import { ManualObservationDraft } from '../../types/manualObservation';

export interface ExtractionContext {
  farmerMessage: string;
  currentDraft: ManualObservationDraft;
  pendingField?: ObservationField;
  pendingValue?: string;
  preferredLanguage?: string;
}

export interface ModelExtractionResult {
  extraction: ObservationExtraction;
  provider: string;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  validationStatus: 'valid' | 'fallback';
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd: number;
  errorCode?: string;
}

export interface ModelGateway {
  extractObservation(context: ExtractionContext): Promise<ModelExtractionResult>;
}
