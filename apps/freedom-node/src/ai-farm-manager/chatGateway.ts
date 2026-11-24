import { CHAT_OUTPUT_SCHEMA, CHAT_PROMPT_FAMILY, CHAT_PROMPT_VERSION, buildChatPrompt } from './chatPrompt';
import type { FarmManagerChatContextPack } from './chatService';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_TIMEOUT_MS = 12_000;

export interface ChatModelResult {
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

export const chatGateway = {
  async generate(pack: FarmManagerChatContextPack): Promise<ChatModelResult> {
    const started = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    const enabled = (process.env.AI_FARM_MANAGER_CHAT_LLM_ENABLED
      ?? process.env.AI_FARM_MANAGER_LLM_ENABLED) === 'true';
    const model = process.env.GEMINI_TEXT_MODEL || DEFAULT_MODEL;
    if (!enabled || !apiKey) {
      return fallbackResult(started, model, enabled ? 'missing_api_key' : 'llm_disabled');
    }
    const timeoutMs = positiveInteger(process.env.GEMINI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/'
        + encodeURIComponent(model) + ':generateContent';
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildChatPrompt(pack) }] }],
          generationConfig: {
            temperature: Number(process.env.AI_FARM_MANAGER_TEMPERATURE || 0.25),
            topP: Number(process.env.AI_FARM_MANAGER_TOP_P || 0.8),
            maxOutputTokens: positiveInteger(process.env.AI_FARM_MANAGER_CHAT_MAX_OUTPUT_TOKENS, 800),
            responseMimeType: 'application/json',
            responseJsonSchema: CHAT_OUTPUT_SCHEMA,
          },
        }),
      });
      if (!response.ok) throw new Error(`gemini_http_${response.status}`);
      const body = await response.json() as Record<string, unknown>;
      const usage = extractUsage(body);
      return {
        provider: 'gemini',
        model,
        promptFamily: CHAT_PROMPT_FAMILY,
        promptVersion: CHAT_PROMPT_VERSION,
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

function fallbackResult(started: number, model: string, errorCode: string): ChatModelResult {
  return {
    provider: 'edgechain',
    model: 'deterministic-chat-pilot',
    promptFamily: CHAT_PROMPT_FAMILY,
    promptVersion: CHAT_PROMPT_VERSION,
    status: 'fallback',
    errorCode: `${errorCode}:${model}`,
    latencyMs: Date.now() - started,
    estimatedCostUsd: 0,
  };
}

function extractOutputText(body: Record<string, unknown>): string {
  const candidate: unknown = Array.isArray(body.candidates) ? body.candidates[0] : undefined;
  const content = isRecord(candidate) && candidate.content;
  if (isRecord(content) && Array.isArray(content.parts)) {
    const text = content.parts
      .filter(isRecord)
      .filter(part => !part.thought && typeof part.text === 'string')
      .map(part => part.text)
      .join('');
    if (text) return text;
  }
  throw new Error('gemini_missing_output_text');
}

function extractUsage(body: Record<string, unknown>): {
  inputTokens?: number;
  outputTokens?: number;
} {
  const usage = isRecord(body.usageMetadata) ? body.usageMetadata : {};
  return {
    inputTokens: numberValue(usage.promptTokenCount),
    outputTokens: numberValue(usage.candidatesTokenCount),
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
