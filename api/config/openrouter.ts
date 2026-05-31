import axios, { AxiosError } from 'axios';
import env from './env';
import { getRequestContext, incrementLlmCallCount } from './request-context';

/**
 * OpenRouter API Client Configuration
 * Supports configurable model selection via environment variables
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = env.openRouterApiKey;
const OPENROUTER_MODEL = env.openRouterModel;

if (!OPENROUTER_API_KEY) {
  console.warn('⚠️  OPENROUTER_API_KEY not set in environment variables');
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterOptions {
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}

interface OpenRouterErrorEnvelope {
  error?: {
    code?: number | string;
    message?: string;
    metadata?: Record<string, unknown>;
  };
  openrouter_metadata?: {
    requested?: string;
    strategy?: string;
    summary?: string;
    attempt?: number;
    endpoints?: {
      total?: number;
      available?: Array<{
        provider?: string;
        model?: string;
        selected?: boolean;
      }>;
    };
  };
  user_id?: string;
}

type OpenRouterTestHandler = (
  messages: OpenRouterMessage[],
  options: OpenRouterOptions
) => Promise<string>;

let testHandler: OpenRouterTestHandler | null = null;

/**
 * Call OpenRouter API with given messages and options
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  if (testHandler) {
    return testHandler(messages, options);
  }

  const { temperature = 0.2, max_tokens = 2048, jsonMode = false } = options;
  const context = getRequestContext();
  const callNumber = incrementLlmCallCount();
  const requestLabel = context?.requestId || 'no-request-id';
  const modelName = getCurrentModel();

  console.log(
    `[${requestLabel}] OpenRouter request #${callNumber || 1} starting` +
      ` model=${modelName} jsonMode=${jsonMode} messages=${messages.length}`
  );

  let response;

  try {
    response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model: OPENROUTER_MODEL,
        messages,
        temperature,
        max_tokens,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Intent-Agent',
          'X-OpenRouter-Experimental-Metadata': 'enabled',
        },
      }
    );
  } catch (error) {
    throw normalizeOpenRouterError(error, requestLabel, callNumber || 1);
  }

  if (!response.data.choices || response.data.choices.length === 0) {
    throw new Error('No response from OpenRouter API');
  }

  const content = response.data.choices[0].message.content;

  if (!content) {
    throw new Error('Empty response from OpenRouter API');
  }

  console.log(
    `[${requestLabel}] OpenRouter request #${callNumber || 1} completed` +
      ` chars=${content.length}`
  );

  return content;
}

/**
 * Call OpenRouter API with JSON response parsing
 */
export async function callOpenRouterJSON<T = any>(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<T> {
  const responseText = await callOpenRouter(messages, { ...options, jsonMode: true });

  // Clean any potential markdown fences or formatting issues
  const cleaned = responseText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse JSON from OpenRouter response:', cleaned);
    throw new Error('Invalid JSON response from OpenRouter API');
  }
}

/**
 * Get the current model being used
 */
export function getCurrentModel(): string {
  return OPENROUTER_MODEL;
}

export function __setOpenRouterHandlerForTests(handler: OpenRouterTestHandler | null) {
  testHandler = handler;
}

function normalizeOpenRouterError(
  error: unknown,
  requestLabel: string,
  callNumber: number
): Error {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error ? error : new Error('Unknown OpenRouter error');
  }

  const status = error.response?.status;
  const data = error.response?.data as OpenRouterErrorEnvelope | undefined;
  const providerMessage = data?.error?.message;
  const metadata = data?.openrouter_metadata;

  if (providerMessage || metadata) {
    console.error(
      `[${requestLabel}] OpenRouter request #${callNumber} failed`,
      {
        status,
        providerMessage,
        requested: metadata?.requested,
        strategy: metadata?.strategy,
        summary: metadata?.summary,
        attempt: metadata?.attempt,
        availableEndpoints: metadata?.endpoints?.available,
      }
    );
  }

  const enrichedMessage = providerMessage
    ? `OpenRouter ${status ?? 'error'}: ${providerMessage}`
    : error.message;

  return new Error(enrichedMessage);
}

export default {
  callOpenRouter,
  callOpenRouterJSON,
  getCurrentModel,
  __setOpenRouterHandlerForTests,
};
