/**
 * LLM Service - Multi-Provider Support
 * Supports: Azure OpenAI, Groq
 * Uses structured outputs (JSON schema) for reliable parsing
 * - Azure: Uses response_format with json_schema
 * - Groq: Uses response_format with json_schema (native structured outputs)
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';
import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';
import {
  getSystemPrompt,
  getGenerationPrompt,
  getRetryPrompt,
  parseGridLevelFromLLM,
  GRID_LEVEL_JSON_SCHEMA
} from '../prompts/mini-golf.js';

// Model configurations
export type ModelProvider = 'azure' | 'groq';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  name: string;
  supportsStructuredOutputs: boolean; // Whether model supports json_schema response format
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'gpt-5-mini': {
    provider: 'azure',
    model: 'gpt-5-mini',
    name: 'GPT-5 Mini (Azure)',
    supportsStructuredOutputs: true
  },
  'kimi-k2': {
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct-0905', // Updated to correct model ID per Groq docs
    name: 'Kimi K2 (Groq)',
    supportsStructuredOutputs: true // Supports json_schema per Groq docs
  },
  'llama-4-scout': {
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout (Groq)',
    supportsStructuredOutputs: true // Supports json_schema per Groq docs
  },
  'llama-4-maverick': {
    provider: 'groq',
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    name: 'Llama 4 Maverick (Groq)',
    supportsStructuredOutputs: true // Supports json_schema per Groq docs
  },
  'llama-3.3-70b': {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    supportsStructuredOutputs: false // Use json_object mode as fallback
  }
};

// Default model - llama-4-scout has best first-attempt success rate
const DEFAULT_MODEL = 'llama-4-scout';

// Client caches
let azureClient: OpenAI | null = null;
let groqClient: Groq | null = null;

function getAzureClient(): OpenAI {
  if (!azureClient) {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://aiatlai.openai.azure.com/openai/v1/';
    if (!apiKey) {
      throw new Error('AZURE_OPENAI_API_KEY environment variable not set');
    }
    azureClient = new OpenAI({
      baseURL: endpoint,
      apiKey: apiKey
    });
  }
  return azureClient;
}

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export interface LLMGenerationResult {
  level: GridLevel | null;
  rawResponse: string;
  error?: string;
  latencyMs?: number;
  model?: string;
}

/**
 * Generate a new GridLevel using the specified model
 * Uses structured outputs (JSON schema) for reliable parsing
 */
export async function generateLevel(
  difficulty: GridLevelDifficulty,
  seed?: string,
  modelId?: string
): Promise<LLMGenerationResult> {
  const modelConfig = AVAILABLE_MODELS[modelId || DEFAULT_MODEL] || AVAILABLE_MODELS[DEFAULT_MODEL];
  const startTime = Date.now();
  
  try {
    let rawResponse: string;
    
    if (modelConfig.provider === 'azure') {
      const client = getAzureClient();
      const response = await client.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: getGenerationPrompt(difficulty, seed) }
        ],
        // GPT-5 Mini only supports temperature=1, so omit it to use default
        max_completion_tokens: 2000, // GPT-5 uses max_completion_tokens instead of max_tokens
        // Structured output - forces valid JSON matching our schema
        response_format: {
          type: 'json_schema',
          json_schema: GRID_LEVEL_JSON_SCHEMA
        }
      } as Parameters<typeof client.chat.completions.create>[0]);
      rawResponse = response.choices[0]?.message?.content || '';
    } else {
      // Groq: Use native JSON schema structured outputs
      const client = getGroqClient();
      
      if (modelConfig.supportsStructuredOutputs) {
        // Use json_schema response format for models that support it
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: getGenerationPrompt(difficulty, seed) }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: GRID_LEVEL_JSON_SCHEMA.name,
              strict: false, // Use best-effort mode for broader compatibility
              schema: GRID_LEVEL_JSON_SCHEMA.schema
            }
          }
        } as Groq.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
        rawResponse = response.choices[0]?.message?.content || '';
      } else {
        // Fallback to json_object mode for models without structured output support
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: getGenerationPrompt(difficulty, seed) }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });
        rawResponse = response.choices[0]?.message?.content || '';
      }
    }

    const latencyMs = Date.now() - startTime;
    const level = parseGridLevelFromLLM(rawResponse);

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from response',
      latencyMs,
      model: modelConfig.name
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`,
      latencyMs,
      model: modelConfig.name
    };
  }
}

/**
 * Retry generation with validation feedback
 * Uses structured outputs (JSON schema) for reliable parsing
 */
export async function retryWithFeedback(
  issues: GridLevelIssue[],
  previousAttempt: string,
  difficulty: GridLevelDifficulty,
  modelId?: string
): Promise<LLMGenerationResult> {
  const modelConfig = AVAILABLE_MODELS[modelId || DEFAULT_MODEL] || AVAILABLE_MODELS[DEFAULT_MODEL];
  const startTime = Date.now();
  
  try {
    let rawResponse: string;
    
    if (modelConfig.provider === 'azure') {
      const client = getAzureClient();
      const response = await client.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: getGenerationPrompt(difficulty) },
          { role: 'assistant', content: previousAttempt },
          { role: 'user', content: getRetryPrompt(issues, previousAttempt) }
        ],
        // GPT-5 Mini only supports temperature=1, so omit it to use default
        max_completion_tokens: 2000, // GPT-5 uses max_completion_tokens instead of max_tokens
        // Structured output - forces valid JSON matching our schema
        response_format: {
          type: 'json_schema',
          json_schema: GRID_LEVEL_JSON_SCHEMA
        }
      } as Parameters<typeof client.chat.completions.create>[0]);
      rawResponse = response.choices[0]?.message?.content || '';
    } else {
      // Groq: Use native JSON schema structured outputs
      const client = getGroqClient();
      
      if (modelConfig.supportsStructuredOutputs) {
        // Use json_schema response format for models that support it
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: getGenerationPrompt(difficulty) },
            { role: 'assistant', content: previousAttempt },
            { role: 'user', content: getRetryPrompt(issues, previousAttempt) }
          ],
          temperature: 0.5,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: GRID_LEVEL_JSON_SCHEMA.name,
              strict: false,
              schema: GRID_LEVEL_JSON_SCHEMA.schema
            }
          }
        } as Groq.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
        rawResponse = response.choices[0]?.message?.content || '';
      } else {
        // Fallback to json_object mode
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: getGenerationPrompt(difficulty) },
            { role: 'assistant', content: previousAttempt },
            { role: 'user', content: getRetryPrompt(issues, previousAttempt) }
          ],
          temperature: 0.5,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });
        rawResponse = response.choices[0]?.message?.content || '';
      }
    }

    const latencyMs = Date.now() - startTime;
    const level = parseGridLevelFromLLM(rawResponse);

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from retry response',
      latencyMs,
      model: modelConfig.name
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`,
      latencyMs,
      model: modelConfig.name
    };
  }
}

/**
 * Get list of available models
 */
export function getAvailableModels(): Array<{ id: string; name: string; provider: string }> {
  return Object.entries(AVAILABLE_MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    provider: config.provider
  }));
}
