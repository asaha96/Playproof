/**
 * PCG Routes
 * POST /pcg/level - Generate a new level
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  PcgLevelRequest,
  PcgLevelResponse,
  GridLevelDifficulty,
  GridLevel
} from '@playproof/shared';
import {
  validateMiniGolfGridLevel,
  lintMiniGolfGridLevel,
  MINI_GOLF_LEVELS
} from '@playproof/shared';

import { generateLevel, retryWithFeedback } from '../services/llm.js';
import { simulateMiniGolfLevel, quickSolvabilityCheck } from '../services/simulation.js';
import { signLevel } from '../services/signing.js';
import { getCacheKey, getCached, setCache } from '../services/cache.js';

const MAX_RETRIES = 5;
const RULESET_VERSION = 1;

interface PcgLevelBody {
  gameId: string;
  difficulty?: GridLevelDifficulty;
  seed?: string | number;
  rulesOverrides?: Record<string, unknown>;
  skipSimulation?: boolean;
  skipCache?: boolean;
}

export async function pcgRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /pcg/level
   * Generate a procedurally generated level
   */
  fastify.post<{ Body: PcgLevelBody }>(
    '/pcg/level',
    {
      schema: {
        body: {
          type: 'object',
          required: ['gameId'],
          properties: {
            gameId: { type: 'string' },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            seed: { anyOf: [{ type: 'string' }, { type: 'number' }] },
            rulesOverrides: { type: 'object' },
            skipSimulation: { type: 'boolean' },
            skipCache: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: PcgLevelBody }>, reply: FastifyReply) => {
      const { gameId, difficulty = 'medium', seed, skipSimulation = false, skipCache = false } = request.body;

      // Only mini-golf supported for now
      if (gameId !== 'mini-golf') {
        return reply.status(400).send({
          error: 'Unsupported gameId',
          message: 'Only mini-golf is supported'
        });
      }

      // Check cache first
      if (!skipCache) {
        const cacheKey = getCacheKey(gameId, difficulty, seed);
        const cached = getCached(cacheKey);
        if (cached) {
          fastify.log.info({ cacheKey }, 'Cache hit');
          return reply.send(cached);
        }
      }

      // Try LLM generation with retry loop
      let level: GridLevel | null = null;
      let lastRawResponse = '';
      let attempts = 0;

      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        attempts++;
        fastify.log.info({ retry, difficulty, seed }, 'Attempting LLM generation');

        const result = retry === 0
          ? await generateLevel(difficulty, seed?.toString())
          : await retryWithFeedback(
              [...validationResult!.errors, ...validationResult!.warnings],
              lastRawResponse,
              difficulty
            );

        if (result.error) {
          fastify.log.warn({ error: result.error, retry }, 'LLM generation error');
          continue;
        }

        if (!result.level) {
          fastify.log.warn({ retry }, 'Failed to parse level from LLM response');
          lastRawResponse = result.rawResponse;
          continue;
        }

        lastRawResponse = result.rawResponse;
        var validationResult = validateMiniGolfGridLevel(result.level);

        if (!validationResult.valid) {
          fastify.log.info(
            { 
              errors: validationResult.errors.length, 
              retry,
              firstErrors: validationResult.errors.slice(0, 3).map(e => e.message)
            },
            'Level failed validation, retrying'
          );
          continue;
        }

        // Quick solvability check (optional)
        if (!skipSimulation) {
          const solvable = quickSolvabilityCheck(result.level);
          if (!solvable) {
            fastify.log.info({ retry }, 'Level not solvable, retrying');
            // Add unsolvable as an error for retry prompt
            validationResult.errors.push({
              stage: 'simulation',
              code: 'simulation.unsolvable',
              message: 'Level could not be solved in simulation. Make the path to the hole more accessible.',
              severity: 'error'
            });
            continue;
          }
        }

        level = result.level;
        break;
      }

      // Fallback to golden level if all retries failed
      if (!level) {
        fastify.log.warn({ attempts }, 'All retries failed, using fallback level');
        
        // Pick a golden level based on difficulty
        const fallbackLevels = MINI_GOLF_LEVELS.filter(
          l => l.rules?.difficulty === difficulty
        );
        level = fallbackLevels[0] || MINI_GOLF_LEVELS[0];
      }

      // Final validation and lint
      const validation = validateMiniGolfGridLevel(level);
      const lint = lintMiniGolfGridLevel(level);

      // Full simulation (if not skipped)
      const simulation = skipSimulation
        ? { passed: true, attempts: 0, note: 'Skipped' }
        : simulateMiniGolfLevel(level);

      // Sign the level
      const signature = signLevel(level);

      const response: PcgLevelResponse = {
        gridLevel: level,
        validationReport: validation,
        lintReport: lint,
        simulationReport: simulation,
        rulesetVersion: RULESET_VERSION,
        signature
      };

      // Cache the result
      if (!skipCache && seed) {
        const cacheKey = getCacheKey(gameId, difficulty, seed);
        setCache(cacheKey, response);
      }

      return reply.send(response);
    }
  );

  /**
   * GET /pcg/health
   * Health check endpoint
   */
  fastify.get('/pcg/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      version: RULESET_VERSION,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /pcg/levels/golden
   * Get curated golden levels
   */
  fastify.get('/pcg/levels/golden', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      levels: MINI_GOLF_LEVELS.map(level => ({
        gridLevel: level,
        validationReport: validateMiniGolfGridLevel(level),
        lintReport: lintMiniGolfGridLevel(level),
        signature: signLevel(level)
      }))
    });
  });
}
