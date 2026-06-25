import {
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
  OBSERVATION_EXTRACTION_JSON_SCHEMA,
  ObservationExtraction,
  parseObservationExtraction,
} from '../domain/observationExtraction';
import {
  ExtractionContext,
  ModelExtractionResult,
  ModelGateway,
} from './modelGateway';
import { heuristicObservationExtraction } from './heuristicExtraction';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_TIMEOUT_MS = 12_000;

export class GeminiModelGateway implements ModelGateway {
  async extractObservation(context: ExtractionContext): Promise<ModelExtractionResult> {
    const started = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    const enabled = process.env.AGENT_LLM_EXTRACTION_ENABLED === 'true';
    const model = process.env.GEMINI_TEXT_MODEL || DEFAULT_MODEL;

    if (!enabled || !apiKey) {
      return fallbackResult(context, started, model, enabled ? 'missing_api_key' : 'llm_disabled');
    }

    const timeoutMs = positiveInteger(process.env.GEMINI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          model,
          input: buildExtractionPrompt(context),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: OBSERVATION_EXTRACTION_JSON_SCHEMA,
          },
        }),
      });

      if (!response.ok) {
        throw new ModelProviderError(`gemini_http_${response.status}`);
      }
      const body = await response.json() as Record<string, unknown>;
      const outputText = extractOutputText(body);
      const extraction = parseObservationExtraction(JSON.parse(outputText));
      const usage = extractUsage(body);
      return {
        extraction,
        provider: 'gemini',
        model,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        validationStatus: 'valid',
        latencyMs: Date.now() - started,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimateGeminiCost(usage.inputTokens, usage.outputTokens),
      };
    } catch (error) {
      const errorCode = error instanceof ModelProviderError
        ? error.message
        : error instanceof Error && error.name === 'AbortError'
          ? 'gemini_timeout'
          : 'gemini_invalid_response';
      return fallbackResult(context, started, model, errorCode);
    } finally {
      clearTimeout(timeout);
    }
  }
}

function fallbackResult(
  context: ExtractionContext,
  started: number,
  model: string,
  errorCode: string
): ModelExtractionResult {
  return {
    extraction: heuristicObservationExtraction(context),
    provider: 'edgechain',
    model: 'deterministic-heuristic-v1',
    promptVersion: EXTRACTION_PROMPT_VERSION,
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    validationStatus: 'fallback',
    latencyMs: Date.now() - started,
    estimatedCostUsd: 0,
    errorCode: `${errorCode}:${model}`,
  };
}

function buildExtractionPrompt(context: ExtractionContext): string {
  return [
    'You are the structured observation interpreter for the EdgeChain Odzi farm pilot.',
    'Extract only facts stated or clearly answered by the farmer.',
    'Do not diagnose disease, prescribe chemicals, or decide workflow actions.',
    'Use the exact enum values in the JSON schema.',
    'Confidence must reflect the evidence in this message, not general plausibility.',
    'A short numeric answer may answer pending_field using the listed enum order.',
    'Shona and English may be mixed.',
    `preferred_language: ${context.preferredLanguage || 'unknown'}`,
    `pending_field: ${context.pendingField || 'none'}`,
    `pending_value_to_confirm: ${context.pendingValue || 'none'}`,
    `current_draft: ${JSON.stringify(context.currentDraft)}`,
    `farmer_message: ${context.farmerMessage}`,
  ].join('\n');
}

function extractOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === 'string') return body.output_text;
  if (typeof body.outputText === 'string') return body.outputText;
  throw new ModelProviderError('gemini_missing_output_text');
}

function extractUsage(body: Record<string, unknown>): {
  inputTokens?: number;
  outputTokens?: number;
} {
  const usage = isRecord(body.usage) ? body.usage : {};
  return {
    inputTokens: numberValue(usage.input_tokens ?? usage.inputTokenCount),
    outputTokens: numberValue(usage.output_tokens ?? usage.outputTokenCount),
  };
}

function estimateGeminiCost(inputTokens?: number, outputTokens?: number): number {
  const inputPerMillion = Number(process.env.GEMINI_INPUT_USD_PER_MILLION || 0.10);
  const outputPerMillion = Number(process.env.GEMINI_OUTPUT_USD_PER_MILLION || 0.40);
  return ((inputTokens || 0) * inputPerMillion + (outputTokens || 0) * outputPerMillion) / 1_000_000;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class ModelProviderError extends Error {}

export const modelGateway = new GeminiModelGateway();
