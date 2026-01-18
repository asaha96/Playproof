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

import { generateLevel, retryWithFeedback, getAvailableModels, AVAILABLE_MODELS, setLogger } from '../services/llm.js';
import { simulateMiniGolfLevel, quickSolvabilityCheck } from '../services/simulation.js';
import { signLevel } from '../services/signing.js';
import { getCacheKey, getCached, setCache } from '../services/cache.js';

const MAX_RETRIES = 5;
const RULESET_VERSION = 1;

interface PcgLevelBody {
  gameId: string;
  difficulty?: GridLevelDifficulty;
  seed?: string | number;
  model?: string;
  rulesOverrides?: Record<string, unknown>;
  skipSimulation?: boolean;
  skipCache?: boolean;
}

interface BenchmarkBody {
  difficulty?: GridLevelDifficulty;
  runsPerModel?: number;
}

interface BenchmarkResult {
  model: string;
  modelId: string;
  runs: number;
  successes: number;
  failures: number;
  successRate: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  errors: string[];
}

export async function pcgRoutes(fastify: FastifyInstance): Promise<void> {
  // Inject logger into LLM service
  setLogger(fastify.log);
  
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
            model: { type: 'string' },
            rulesOverrides: { type: 'object' },
            skipSimulation: { type: 'boolean' },
            skipCache: { type: 'boolean' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: PcgLevelBody }>, reply: FastifyReply) => {
      const { gameId, difficulty = 'medium', seed, model, skipSimulation = false, skipCache = false } = request.body;

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
      let totalLatencyMs = 0;
      let usedModel = '';
      let validationResult: ReturnType<typeof validateMiniGolfGridLevel> | null = null;
      let lastError = '';

      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        attempts++;
        fastify.log.info({ retry, difficulty, seed, model }, 'Attempting LLM generation');

        // Use retry with feedback if we have previous validation errors, otherwise generate fresh
        const result = (retry > 0 && validationResult && !validationResult.valid)
          ? await retryWithFeedback(
              [...validationResult.errors, ...validationResult.warnings],
              lastRawResponse,
              difficulty,
              model
            )
          : await generateLevel(difficulty, seed?.toString(), model);

        totalLatencyMs += result.latencyMs || 0;
        usedModel = result.model || '';

        if (result.error) {
          lastError = result.error;
          fastify.log.warn({ error: result.error, retry, latencyMs: result.latencyMs }, 'LLM generation error');
          continue;
        }

        if (!result.level) {
          lastError = 'Failed to parse level from LLM response';
          fastify.log.warn({ retry, latencyMs: result.latencyMs }, 'Failed to parse level from LLM response');
          lastRawResponse = result.rawResponse;
          continue;
        }

        // Defensive check: ensure level has valid grid structure before validation
        if (!result.level.grid || !Array.isArray(result.level.grid.tiles) || result.level.grid.tiles.length === 0) {
          lastError = 'Level missing valid grid.tiles array';
          fastify.log.warn({ retry, latencyMs: result.latencyMs }, 'Level has invalid grid structure');
          lastRawResponse = result.rawResponse;
          continue;
        }

        lastRawResponse = result.rawResponse;
        validationResult = validateMiniGolfGridLevel(result.level);

        if (!validationResult.valid) {
          fastify.log.info(
            { 
              errors: validationResult.errors.length, 
              retry,
              latencyMs: result.latencyMs,
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
            fastify.log.info({ retry, latencyMs: result.latencyMs }, 'Level not solvable, retrying');
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
        fastify.log.info({ retry, latencyMs: result.latencyMs, model: usedModel }, 'Level generated successfully');
        break;
      }

      // Fallback to golden level if all retries failed
      let debugInfo: { fellBack: boolean; reason: string; lastValidationErrors: string[] } | undefined;
      if (!level) {
        fastify.log.warn({ attempts, totalLatencyMs, lastError }, 'All retries failed, using fallback level');
        
        const fallbackLevels = MINI_GOLF_LEVELS.filter(
          l => l.rules?.difficulty === difficulty
        );
        level = fallbackLevels[0] || MINI_GOLF_LEVELS[0];
        
        // Add debug info about why we fell back
        debugInfo = {
          fellBack: true,
          reason: lastError,
          lastValidationErrors: validationResult?.errors?.slice(0, 5).map(e => e.message) || []
        };
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

      const response: PcgLevelResponse & { meta?: { model: string; latencyMs: number; attempts: number }; debug?: typeof debugInfo } = {
        gridLevel: level,
        validationReport: validation,
        lintReport: lint,
        simulationReport: simulation,
        rulesetVersion: RULESET_VERSION,
        signature
      };

      // Add metadata
      if (usedModel) {
        (response as any).meta = {
          model: usedModel,
          latencyMs: totalLatencyMs,
          attempts
        };
      }
      
      // Add debug info if we fell back
      if (debugInfo) {
        (response as any).debug = debugInfo;
      }

      // Cache the result
      if (!skipCache && seed) {
        const cacheKey = getCacheKey(gameId, difficulty, seed);
        setCache(cacheKey, response);
      }

      return reply.send(response);
    }
  );

  /**
   * GET /pcg/models
   * List available LLM models
   */
  fastify.get('/pcg/models', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      models: getAvailableModels(),
      default: 'gpt-5-mini'
    });
  });

  /**
   * POST /pcg/benchmark
   * Benchmark all models for level generation
   */
  fastify.post<{ Body: BenchmarkBody }>(
    '/pcg/benchmark',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            runsPerModel: { type: 'number', minimum: 1, maximum: 10 }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: BenchmarkBody }>, reply: FastifyReply) => {
      const { difficulty = 'easy', runsPerModel = 3 } = request.body;
      
      const results: BenchmarkResult[] = [];
      const modelIds = Object.keys(AVAILABLE_MODELS);

      for (const modelId of modelIds) {
        const modelConfig = AVAILABLE_MODELS[modelId];
        fastify.log.info({ modelId, modelName: modelConfig.name }, 'Benchmarking model');

        const latencies: number[] = [];
        const errors: string[] = [];
        let successes = 0;
        let failures = 0;

        for (let run = 0; run < runsPerModel; run++) {
          const result = await generateLevel(difficulty, undefined, modelId);
          
          if (result.latencyMs) {
            latencies.push(result.latencyMs);
          }

          if (result.error) {
            failures++;
            if (!errors.includes(result.error.slice(0, 100))) {
              errors.push(result.error.slice(0, 100));
            }
            continue;
          }

          if (!result.level) {
            failures++;
            errors.push('Failed to parse level');
            continue;
          }

          const validation = validateMiniGolfGridLevel(result.level);
          if (validation.valid) {
            successes++;
          } else {
            failures++;
            const firstError = validation.errors[0]?.message || 'Unknown validation error';
            if (!errors.includes(firstError)) {
              errors.push(firstError);
            }
          }
        }

        const avgLatency = latencies.length > 0 
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

        results.push({
          model: modelConfig.name,
          modelId,
          runs: runsPerModel,
          successes,
          failures,
          successRate: Math.round((successes / runsPerModel) * 100),
          avgLatencyMs: avgLatency,
          minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
          maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
          errors: errors.slice(0, 3)
        });
      }

      // Sort by success rate (desc), then by avg latency (asc)
      results.sort((a, b) => {
        if (b.successRate !== a.successRate) return b.successRate - a.successRate;
        return a.avgLatencyMs - b.avgLatencyMs;
      });

      return reply.send({
        benchmark: {
          difficulty,
          runsPerModel,
          timestamp: new Date().toISOString()
        },
        results,
        recommendation: results[0]?.modelId || 'gpt-5-mini'
      });
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
