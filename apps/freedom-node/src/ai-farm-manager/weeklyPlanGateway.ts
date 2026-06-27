import { FarmManagerContextPack } from './contextPackService';
import {
  WEEKLY_PLAN_OUTPUT_SCHEMA,
  WEEKLY_PLAN_PROMPT_FAMILY,
  WEEKLY_PLAN_PROMPT_VERSION,
  buildWeeklyPlanPrompt,
} from './weeklyPlanPrompt';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_TIMEOUT_MS = 12_000;

export interface WeeklyPlanModelResult {
  provider: 'gemini' | 'edgechain';
  model: string;
  promptFamily: string;
  promptVersion: string;
  status: 'success' | 'fallback' | 'error';
  output?: unknown;
  errorCode?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export const weeklyPlanGateway = {
  async generate(pack: FarmManagerContextPack): Promise<WeeklyPlanModelResult> {
    const started = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    const enabled = process.env.AI_FARM_MANAGER_LLM_ENABLED === 'true';
    const model = process.env.GEMINI_TEXT_MODEL || DEFAULT_MODEL;
    if (!enabled || !apiKey) {
      return fallbackResult(
        started,
        model,
        enabled ? 'missing_api_key' : 'llm_disabled'
      );
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
          input: buildWeeklyPlanPrompt(pack),
          temperature: Number(process.env.AI_FARM_MANAGER_TEMPERATURE || 0.25),
          top_p: Number(process.env.AI_FARM_MANAGER_TOP_P || 0.8),
          max_output_tokens: positiveInteger(
            process.env.AI_FARM_MANAGER_MAX_OUTPUT_TOKENS,
            1200
          ),
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: WEEKLY_PLAN_OUTPUT_SCHEMA,
          },
        }),
      });
      if (!response.ok) throw new Error(`gemini_http_${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const usage = extractUsage(body);
      return {
        provider: 'gemini',
        model,
        promptFamily: WEEKLY_PLAN_PROMPT_FAMILY,
        promptVersion: WEEKLY_PLAN_PROMPT_VERSION,
        status: 'success',
        output: JSON.parse(extractOutputText(body)),
        latencyMs: Date.now() - started,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimateGeminiCost(usage.inputTokens, usage.outputTokens),
      };
    } catch (error) {
      return {
        ...fallbackResult(
          started,
          model,
          error instanceof Error && error.name === 'AbortError'
            ? 'gemini_timeout'
            : error instanceof Error
              ? error.message
              : 'gemini_error'
        ),
        status: 'error',
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

function fallbackResult(
  started: number,
  model: string,
  errorCode: string
): WeeklyPlanModelResult {
  return {
    provider: 'edgechain',
    model: 'deterministic-weekly-plan-pilot',
    promptFamily: WEEKLY_PLAN_PROMPT_FAMILY,
    promptVersion: WEEKLY_PLAN_PROMPT_VERSION,
    status: 'fallback',
    errorCode: `${errorCode}:${model}`,
    latencyMs: Date.now() - started,
    estimatedCostUsd: 0,
  };
}

function extractOutputText(body: Record<string, unknown>): string {
  if (typeof body.output_text === 'string') return body.output_text;
  if (typeof body.outputText === 'string') return body.outputText;
  throw new Error('gemini_missing_output_text');
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
