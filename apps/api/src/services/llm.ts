/**
 * LLM Service - Groq Integration
 * Uses Groq's free tier with Llama 3.1 for level generation
 */

import Groq from 'groq-sdk';
import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';
import {
  getSystemPrompt,
  getGenerationPrompt,
  getRetryPrompt,
  parseGridLevelFromLLM
} from '../prompts/mini-golf.js';

const MODEL = 'llama-3.3-70b-versatile';

let groqClient: Groq | null = null;

function getClient(): Groq {
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
}

/**
 * Generate a new GridLevel using the LLM
 */
export async function generateLevel(
  difficulty: GridLevelDifficulty,
  seed?: string
): Promise<LLMGenerationResult> {
  const client = getClient();
  
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: getGenerationPrompt(difficulty, seed) }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    const level = parseGridLevelFromLLM(rawResponse);

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from response'
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`
    };
  }
}

/**
 * Retry generation with validation feedback
 */
export async function retryWithFeedback(
  issues: GridLevelIssue[],
  previousAttempt: string,
  difficulty: GridLevelDifficulty
): Promise<LLMGenerationResult> {
  const client = getClient();
  
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: getGenerationPrompt(difficulty) },
        { role: 'assistant', content: previousAttempt },
        { role: 'user', content: getRetryPrompt(issues, previousAttempt) }
      ],
      temperature: 0.5, // Lower temp for corrections
      max_tokens: 2000
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    const level = parseGridLevelFromLLM(rawResponse);

    return {
      level,
      rawResponse,
      error: level ? undefined : 'Failed to parse GridLevel from retry response'
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      level: null,
      rawResponse: '',
      error: `LLM API error: ${errorMsg}`
    };
  }
}
