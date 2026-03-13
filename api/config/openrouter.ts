import axios from 'axios';
import env from './env';

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

/**
 * Call OpenRouter API with given messages and options
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions = {}
): Promise<string> {
  const { temperature = 0.2, max_tokens = 2048, jsonMode = false } = options;

  const response = await axios.post<OpenRouterResponse>(
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
        'HTTP-Referer': 'http://localhost:3000', // OpenRouter requirement
        'X-Title': 'Intent-Agent', // OpenRouter requirement
      },
    }
  );

  if (!response.data.choices || response.data.choices.length === 0) {
    throw new Error('No response from OpenRouter API');
  }

  const content = response.data.choices[0].message.content;

  if (!content) {
    throw new Error('Empty response from OpenRouter API');
  }

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

export default {
  callOpenRouter,
  callOpenRouterJSON,
  getCurrentModel,
};
