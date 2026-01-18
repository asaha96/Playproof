/**
 * LLM Service - Multi-Provider Support
 * Supports: Azure OpenAI, Groq
 * Uses structured outputs (JSON schema) for reliable parsing
 * - Azure: Uses response_format with json_schema
 * - Groq: Uses response_format with json_schema (native structured outputs)
 * 
 * 2-stage pipeline:
 * 1. Generate intent (design brief) with higher temperature for creativity
 * 2. Generate level based on intent with controlled temperature
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';
import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';
import {
  getSystemPrompt,
  getGenerationPrompt,
  getRetryPrompt,
  parseGridLevelFromLLM,
  GRID_LEVEL_JSON_SCHEMA,
  // New intent-related imports
  getIntentSystemPrompt,
  getIntentGenerationPrompt,
  getGenerationPromptWithIntent,
  getRetryPromptWithIntent,
  parseIntentFromLLM,
  LEVEL_INTENT_JSON_SCHEMA,
  type LevelIntent
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
  temperature?: number;  // Track what temperature was used
}

export interface IntentGenerationResult {
  intent: LevelIntent | null;
  rawResponse: string;
  error?: string;
  latencyMs?: number;
  model?: string;
  temperature?: number;
}

// Logger interface (injected from route)
let logger: { info: (msg: string, data?: object) => void; warn: (msg: string, data?: object) => void } | null = null;

export function setLogger(l: typeof logger) {
  logger = l;
}

function log(level: 'info' | 'warn', msg: string, data?: object) {
  if (logger) {
    logger[level](msg, data);
  } else {
    console[level](`[LLM] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// ============================================================================
// TEMPERATURE RANDOMIZATION
// ============================================================================

/**
 * Safe temperature ranges for different generation stages
 * - Intent: higher for creativity (0.75-0.95)
 * - Level generation: moderate (0.55-0.75) 
 * - Retry: lower to converge (0.35-0.55)
 */
export function getRandomTemperature(stage: 'intent' | 'generation' | 'retry'): number {
  const ranges: Record<string, [number, number]> = {
    intent: [0.75, 0.95],      // More creative for design briefs
    generation: [0.55, 0.75],  // Balanced for level construction
    retry: [0.35, 0.55]        // More conservative to fix errors
  };
  
  const [min, max] = ranges[stage] || [0.5, 0.7];
  const temp = min + Math.random() * (max - min);
  // Round to 2 decimal places for cleaner logs
  return Math.round(temp * 100) / 100;
}

// ============================================================================
// INTENT GENERATION (Stage 1 of 2-stage pipeline)
// ============================================================================

/**
 * Generate a design intent/brief for a level
 * This is Stage 1 of the 2-stage pipeline
 */
export async function generateLevelIntent(
  difficulty: GridLevelDifficulty,
  modelId?: string
): Promise<IntentGenerationResult> {
  const modelConfig = AVAILABLE_MODELS[modelId || DEFAULT_MODEL] || AVAILABLE_MODELS[DEFAULT_MODEL];
  const startTime = Date.now();
  const temperature = getRandomTemperature('intent');
  
  log('info', 'Generating level intent', { difficulty, model: modelConfig.name, temperature });
  
  try {
    let rawResponse: string;
    
    if (modelConfig.provider === 'azure') {
      // Azure: use default temperature (GPT-5 Mini limitation)
      const client = getAzureClient();
      const response = await client.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: getIntentSystemPrompt() },
          { role: 'user', content: getIntentGenerationPrompt(difficulty) }
        ],
        max_completion_tokens: 1000,
        response_format: {
          type: 'json_schema',
          json_schema: LEVEL_INTENT_JSON_SCHEMA
        }
      } as Parameters<typeof client.chat.completions.create>[0]);
      rawResponse = (response as any).choices[0]?.message?.content || '';
    } else {
      // Groq: use randomized temperature
      const client = getGroqClient();
      
      if (modelConfig.supportsStructuredOutputs) {
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getIntentSystemPrompt() },
            { role: 'user', content: getIntentGenerationPrompt(difficulty) }
          ],
          temperature,
          max_tokens: 1000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: LEVEL_INTENT_JSON_SCHEMA.name,
              strict: false,
              schema: LEVEL_INTENT_JSON_SCHEMA.schema
            }
          }
        } as any);
        rawResponse = (response as any).choices[0]?.message?.content || '';
      } else {
        // Fallback to json_object mode
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getIntentSystemPrompt() },
            { role: 'user', content: getIntentGenerationPrompt(difficulty) }
          ],
          temperature,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        });
        rawResponse = (response as any).choices[0]?.message?.content || '';
      }
    }
    
    const latencyMs = Date.now() - startTime;
    
    log('info', 'Intent raw response received', {
      model: modelConfig.name,
      latencyMs,
      temperature,
      responseLength: rawResponse.length,
      responsePreview: rawResponse.slice(0, 500)
    });
    
    const intent = parseIntentFromLLM(rawResponse);
    
    if (!intent) {
      log('warn', 'Failed to parse intent', {
        model: modelConfig.name,
        rawResponse: rawResponse.slice(0, 1000)
      });
    } else {
      log('info', 'Intent parsed successfully', {
        intent: intent.intent,
        layoutDirective: intent.layoutDirective
      });
    }
    
    return {
      intent,
      rawResponse,
      error: intent ? undefined : 'Failed to parse intent from response',
      latencyMs,
      model: modelConfig.name,
      temperature
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    log('warn', 'Intent generation API error', {
      model: modelConfig.name,
      error: errorMsg,
      latencyMs
    });
    return {
      intent: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`,
      latencyMs,
      model: modelConfig.name,
      temperature
    };
  }
}

// ============================================================================
// LEVEL GENERATION (Stage 2 of 2-stage pipeline)
// ============================================================================

/**
 * Generate a new GridLevel using the specified model
 * Uses structured outputs (JSON schema) for reliable parsing
 * 
 * @param difficulty - Level difficulty
 * @param intent - Optional LevelIntent from stage 1 (if provided, uses intent-based prompt)
 * @param modelId - Optional model ID override
 */
export async function generateLevel(
  difficulty: GridLevelDifficulty,
  intent?: LevelIntent | null,
  modelId?: string
): Promise<LLMGenerationResult> {
  const modelConfig = AVAILABLE_MODELS[modelId || DEFAULT_MODEL] || AVAILABLE_MODELS[DEFAULT_MODEL];
  const startTime = Date.now();
  const temperature = getRandomTemperature('generation');
  
  // Choose prompt based on whether we have an intent
  const userPrompt = intent 
    ? getGenerationPromptWithIntent(difficulty, intent)
    : getGenerationPrompt(difficulty);
  
  log('info', 'Generating level', { 
    difficulty, 
    model: modelConfig.name, 
    temperature,
    hasIntent: !!intent,
    intentSummary: intent?.intent?.slice(0, 50)
  });
  
  try {
    let rawResponse: string;
    
    if (modelConfig.provider === 'azure') {
      const client = getAzureClient();
      const response = await client.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: userPrompt }
        ],
        // GPT-5 Mini only supports temperature=1, so omit it to use default
        max_completion_tokens: 2000,
        response_format: {
          type: 'json_schema',
          json_schema: GRID_LEVEL_JSON_SCHEMA
        }
      } as Parameters<typeof client.chat.completions.create>[0]);
      rawResponse = (response as any).choices[0]?.message?.content || '';
    } else {
      // Groq: Use native JSON schema structured outputs with random temperature
      const client = getGroqClient();
      
      if (modelConfig.supportsStructuredOutputs) {
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: GRID_LEVEL_JSON_SCHEMA.name,
              strict: false,
              schema: GRID_LEVEL_JSON_SCHEMA.schema
            }
          }
        } as any);
        rawResponse = (response as any).choices[0]?.message?.content || '';
      } else {
        // Fallback to json_object mode
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });
        rawResponse = (response as any).choices[0]?.message?.content || '';
      }
    }

    const latencyMs = Date.now() - startTime;
    
    log('info', 'LLM raw response received', {
      model: modelConfig.name,
      latencyMs,
      temperature,
      responseLength: rawResponse.length,
      responsePreview: rawResponse.slice(0, 800) + (rawResponse.length > 800 ? '...' : ''),
      isEmpty: rawResponse.trim() === ''
    });
    
    let level = parseGridLevelFromLLM(rawResponse);
    
    // If we have an intent, forcibly set the design object to match it
    if (level && intent) {
      level.design = {
        intent: intent.intent,
        playerHint: intent.playerHint,
        solutionSketch: intent.solutionSketch,
        aestheticNotes: intent.aestheticNotes
      };
    }
    
    if (!level) {
      log('warn', 'Failed to parse GridLevel', {
        model: modelConfig.name,
        responseLength: rawResponse.length,
        rawResponseFull: rawResponse.length < 2000 ? rawResponse : rawResponse.slice(0, 2000) + '...[truncated]'
      });
    }

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from response',
      latencyMs,
      model: modelConfig.name,
      temperature
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    log('warn', 'LLM API error', {
      model: modelConfig.name,
      error: errorMsg,
      latencyMs
    });
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`,
      latencyMs,
      model: modelConfig.name,
      temperature
    };
  }
}

/**
 * Retry generation with validation feedback
 * Uses structured outputs (JSON schema) for reliable parsing
 * 
 * @param issues - Validation issues from previous attempt
 * @param previousAttempt - Raw response from previous attempt
 * @param difficulty - Level difficulty
 * @param intent - Optional LevelIntent to maintain consistency across retries
 * @param modelId - Optional model ID override
 */
export async function retryWithFeedback(
  issues: GridLevelIssue[],
  previousAttempt: string,
  difficulty: GridLevelDifficulty,
  intent?: LevelIntent | null,
  modelId?: string
): Promise<LLMGenerationResult> {
  const modelConfig = AVAILABLE_MODELS[modelId || DEFAULT_MODEL] || AVAILABLE_MODELS[DEFAULT_MODEL];
  const startTime = Date.now();
  const temperature = getRandomTemperature('retry');
  
  // Choose prompt based on whether we have an intent
  const initialPrompt = intent 
    ? getGenerationPromptWithIntent(difficulty, intent)
    : getGenerationPrompt(difficulty);
  const retryPrompt = intent
    ? getRetryPromptWithIntent(issues, previousAttempt, intent)
    : getRetryPrompt(issues, previousAttempt);
  
  log('info', 'Retrying level generation', { 
    difficulty, 
    model: modelConfig.name, 
    temperature,
    hasIntent: !!intent,
    errorCount: issues.filter(i => i.severity === 'error').length
  });
  
  try {
    let rawResponse: string;
    
    if (modelConfig.provider === 'azure') {
      const client = getAzureClient();
      const response = await client.chat.completions.create({
        model: modelConfig.model,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: initialPrompt },
          { role: 'assistant', content: previousAttempt },
          { role: 'user', content: retryPrompt }
        ],
        max_completion_tokens: 2000,
        response_format: {
          type: 'json_schema',
          json_schema: GRID_LEVEL_JSON_SCHEMA
        }
      } as Parameters<typeof client.chat.completions.create>[0]);
      rawResponse = (response as any).choices[0]?.message?.content || '';
    } else {
      // Groq: Use native JSON schema structured outputs with random retry temperature
      const client = getGroqClient();
      
      if (modelConfig.supportsStructuredOutputs) {
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: initialPrompt },
            { role: 'assistant', content: previousAttempt },
            { role: 'user', content: retryPrompt }
          ],
          temperature,
          max_tokens: 2000,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: GRID_LEVEL_JSON_SCHEMA.name,
              strict: false,
              schema: GRID_LEVEL_JSON_SCHEMA.schema
            }
          }
        } as any);
        rawResponse = (response as any).choices[0]?.message?.content || '';
      } else {
        // Fallback to json_object mode
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: getSystemPrompt() },
            { role: 'user', content: initialPrompt },
            { role: 'assistant', content: previousAttempt },
            { role: 'user', content: retryPrompt }
          ],
          temperature,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        });
        rawResponse = (response as any).choices[0]?.message?.content || '';
      }
    }

    const latencyMs = Date.now() - startTime;
    
    log('info', 'LLM retry raw response received', {
      model: modelConfig.name,
      latencyMs,
      temperature,
      responseLength: rawResponse.length,
      responsePreview: rawResponse.slice(0, 500) + (rawResponse.length > 500 ? '...' : '')
    });
    
    let level = parseGridLevelFromLLM(rawResponse);
    
    // If we have an intent, forcibly set the design object to match it
    if (level && intent) {
      level.design = {
        intent: intent.intent,
        playerHint: intent.playerHint,
        solutionSketch: intent.solutionSketch,
        aestheticNotes: intent.aestheticNotes
      };
    }
    
    if (!level) {
      log('warn', 'Failed to parse GridLevel from retry', {
        model: modelConfig.name,
        rawResponse: rawResponse.slice(0, 1000)
      });
    }

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from retry response',
      latencyMs,
      model: modelConfig.name,
      temperature
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    log('warn', 'LLM retry API error', {
      model: modelConfig.name,
      error: errorMsg,
      latencyMs
    });
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`,
      latencyMs,
      model: modelConfig.name,
      temperature
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
