/**
 * PCG Routes
 * POST /pcg/level - Generate a new level using 2-stage pipeline
 * 
 * Supports games: mini-golf, basketball, archery
 * 
 * 2-stage pipeline:
 * 1. Generate intent (design brief) - higher temperature for creativity
 * 2. Generate level based on intent - controlled temperature
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  PcgLevelRequest,
  PcgLevelResponse,
  GridLevelDifficulty,
  GridLevel,
  GridLevelValidationReport,
  GridLevelLintReport
} from '@playproof/shared';

// Mini-golf imports
import {
  validateMiniGolfGridLevel,
  lintMiniGolfGridLevel,
  MINI_GOLF_LEVELS
} from '@playproof/shared';

// Basketball imports
import {
  validateBasketballGridLevel,
  lintBasketballGridLevel,
  getGoldenBasketballLevels
} from '@playproof/shared';

// Archery imports  
import {
  validateArcheryGridLevel,
  lintArcheryGridLevel,
  getGoldenArcheryLevels
} from '@playproof/shared';

import { 
  generateLevel, 
  retryWithFeedback, 
  generateLevelIntent, 
  getAvailableModels, 
  AVAILABLE_MODELS, 
  setLogger,
  type GameId,
  type GameLevelIntent
} from '../services/llm.js';

import { simulateMiniGolfLevel, quickSolvabilityCheck } from '../services/simulation.js';
import { signLevel } from '../services/signing.js';
import { getCacheKey, getCached, setCache } from '../services/cache.js';

// Sanitizers
import { sanitizeGridLevel } from '../services/sanitizer.js';
import { sanitizeBasketballGridLevel } from '../services/basketball-sanitizer.js';
import { sanitizeArcheryGridLevel } from '../services/archery-sanitizer.js';

const MAX_RETRIES = 5;
const RULESET_VERSION = 1;

// Supported game IDs
const SUPPORTED_GAMES: GameId[] = ['mini-golf', 'basketball', 'archery'];

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
  gameId?: string;
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

// Extended debug info for 2-stage pipeline
interface DebugInfo {
  fellBack: boolean;
  reason: string;
  lastValidationErrors: string[];
  intent?: GameLevelIntent | null;
  intentLatencyMs?: number;
  intentTemperature?: number;
  generationTemperatures?: number[];
}

// ============================================================================
// GAME-SPECIFIC DISPATCH HELPERS
// ============================================================================

interface GamePack {
  validate: (level: GridLevel) => GridLevelValidationReport;
  lint: (level: GridLevel) => GridLevelLintReport;
  sanitize: (level: GridLevel) => { level: GridLevel; fixes: string[] };
  getGoldenLevels: () => GridLevel[];
  // Simulation is optional - only mini-golf has it for now
  quickSolvabilityCheck?: (level: GridLevel) => boolean;
  simulate?: (level: GridLevel) => { passed: boolean; attempts: number };
}

function getGamePack(gameId: GameId): GamePack {
  switch (gameId) {
    case 'basketball':
      return {
        validate: validateBasketballGridLevel,
        lint: lintBasketballGridLevel,
        sanitize: sanitizeBasketballGridLevel,
        getGoldenLevels: getGoldenBasketballLevels
        // No simulation yet for basketball
      };
    case 'archery':
      return {
        validate: validateArcheryGridLevel,
        lint: lintArcheryGridLevel,
        sanitize: sanitizeArcheryGridLevel,
        getGoldenLevels: getGoldenArcheryLevels
        // No simulation yet for archery
      };
    case 'mini-golf':
    default:
      return {
        validate: validateMiniGolfGridLevel,
        lint: lintMiniGolfGridLevel,
        sanitize: sanitizeGridLevel,
        getGoldenLevels: () => MINI_GOLF_LEVELS,
        quickSolvabilityCheck,
        simulate: simulateMiniGolfLevel
      };
  }
}

export async function pcgRoutes(fastify: FastifyInstance): Promise<void> {
  // Inject logger into LLM service
  setLogger(fastify.log);
  
  /**
   * POST /pcg/level
   * Generate a procedurally generated level using 2-stage pipeline
   * Supports: mini-golf, basketball, archery
   */
  fastify.post<{ Body: PcgLevelBody }>(
    '/pcg/level',
    {
      schema: {
        body: {
          type: 'object',
          required: ['gameId'],
          properties: {
            gameId: { type: 'string', enum: SUPPORTED_GAMES },
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
      const { gameId: rawGameId, difficulty = 'medium', model, skipSimulation = false, skipCache = false } = request.body;
      // NOTE: seed is intentionally ignored - we always generate fresh, random levels

      // Validate gameId
      if (!SUPPORTED_GAMES.includes(rawGameId as GameId)) {
        return reply.status(400).send({
          error: 'Unsupported gameId',
          message: `Supported games: ${SUPPORTED_GAMES.join(', ')}`
        });
      }
      
      const gameId = rawGameId as GameId;
      const gamePack = getGamePack(gameId);

      // NOTE: Cache is disabled for now since we want every request to be unique
      // If caching is needed in the future, use a hash of intent + difficulty

      // ========================================================================
      // STAGE 1: Generate Intent (design brief)
      // ========================================================================
      fastify.log.info({ gameId, difficulty, model }, 'Stage 1: Generating level intent');
      
      const intentResult = await generateLevelIntent(gameId, difficulty, model);
      const intent: GameLevelIntent | null = intentResult.intent;
      
      const debugInfo: DebugInfo = {
        fellBack: false,
        reason: '',
        lastValidationErrors: [],
        intent: intent,
        intentLatencyMs: intentResult.latencyMs,
        intentTemperature: intentResult.temperature,
        generationTemperatures: []
      };
      
      if (!intent) {
        fastify.log.warn({ error: intentResult.error }, 'Failed to generate intent, proceeding without intent');
      } else {
        fastify.log.info({ 
          gameId,
          intent: intent.intent,
          layoutDirective: intent.layoutDirective,
          temperature: intentResult.temperature
        }, 'Intent generated successfully');
      }

      // ========================================================================
      // STAGE 2: Generate Level based on Intent
      // ========================================================================
      let level: GridLevel | null = null;
      let lastRawResponse = '';
      let attempts = 0;
      let totalLatencyMs = intentResult.latencyMs || 0;
      let usedModel = intentResult.model || '';
      let validationResult: GridLevelValidationReport | null = null;
      let lastError = '';

      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        attempts++;
        fastify.log.info({ gameId, retry, difficulty, model, hasIntent: !!intent }, 'Stage 2: Attempting level generation');

        // Use retry with feedback if we have previous validation errors, otherwise generate fresh
        const result = (retry > 0 && validationResult && !validationResult.valid)
          ? await retryWithFeedback(
              gameId,
              [...validationResult.errors, ...validationResult.warnings],
              lastRawResponse,
              difficulty,
              intent,  // Pass intent to maintain consistency across retries
              model
            )
          : await generateLevel(gameId, difficulty, intent, model);

        // Track temperatures used
        if (result.temperature) {
          debugInfo.generationTemperatures!.push(result.temperature);
        }

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
        
        // Log the full grid for debugging (one row per line for readability)
        if (result.level?.grid?.tiles) {
          const tiles = result.level.grid.tiles;
          fastify.log.info({ gameId, retry, model: usedModel, temperature: result.temperature }, 'LLM generated grid:');
          tiles.forEach((row, i) => {
            fastify.log.info(`  row ${i.toString().padStart(2, '0')}: ${row}`);
          });
        }
        
        // Apply game-specific sanitizer to fix common LLM mistakes before validation
        const sanitized = gamePack.sanitize(result.level);
        if (sanitized.fixes.length > 0) {
          fastify.log.info({ gameId, fixes: sanitized.fixes }, 'Sanitizer applied fixes');
        }
        
        // Game-specific validation
        validationResult = gamePack.validate(sanitized.level);

        if (!validationResult.valid) {
          // Capture validation errors for debug.reason
          lastError = validationResult.errors.slice(0, 3).map(e => `${e.code}: ${e.message}`).join('; ');
          
          // Enhanced logging for validation failures
          const errorDetails = validationResult.errors.map(e => ({
            code: e.code,
            message: e.message,
            data: e.data
          }));
          
          fastify.log.info(
            { 
              gameId,
              errors: validationResult.errors.length, 
              retry,
              latencyMs: result.latencyMs,
              errorDetails
            },
            'Level failed validation, retrying'
          );
          continue;
        }

        // Quick solvability check (if available for this game and not skipped)
        if (!skipSimulation && gamePack.quickSolvabilityCheck) {
          const solvable = gamePack.quickSolvabilityCheck(sanitized.level);
          if (!solvable) {
            fastify.log.info({ gameId, retry, latencyMs: result.latencyMs }, 'Level not solvable, retrying');
            validationResult.errors.push({
              stage: 'simulation',
              code: 'simulation.unsolvable',
              message: 'Level could not be solved in simulation. Make the path more accessible.',
              severity: 'error'
            });
            lastError = 'simulation.unsolvable: Level could not be solved';
            continue;
          }
        }

        level = sanitized.level;
        fastify.log.info({ gameId, retry, latencyMs: result.latencyMs, model: usedModel, temperature: result.temperature }, 'Level generated successfully');
        break;
      }

      // Fallback to golden level if all retries failed
      if (!level) {
        fastify.log.warn({ gameId, attempts, totalLatencyMs, lastError }, 'All retries failed, using fallback level');
        
        const goldenLevels = gamePack.getGoldenLevels();
        const fallbackLevels = goldenLevels.filter(
          l => l.rules?.difficulty === difficulty
        );
        level = fallbackLevels[0] || goldenLevels[0];
        
        // Update debug info for fallback
        debugInfo.fellBack = true;
        debugInfo.reason = lastError;
        debugInfo.lastValidationErrors = validationResult?.errors?.slice(0, 5).map(e => e.message) || [];
      }

      // Final validation and lint using game-specific functions
      const validation = gamePack.validate(level);
      const lint = gamePack.lint(level);

      // Full simulation (if available for this game and not skipped)
      const simulation = skipSimulation || !gamePack.simulate
        ? { passed: true, attempts: 0, note: 'Skipped' }
        : gamePack.simulate(level);

      // Sign the level
      const signature = signLevel(level);

      const response: PcgLevelResponse & { 
        meta?: { 
          model: string; 
          latencyMs: number; 
          attempts: number;
          intentLatencyMs?: number;
        }; 
        debug?: DebugInfo 
      } = {
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
          attempts,
          intentLatencyMs: intentResult.latencyMs
        };
      }
      
      // Always add debug info for observability (includes intent, temperatures)
      (response as any).debug = debugInfo;

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
      default: 'gpt-5-mini',
      supportedGames: SUPPORTED_GAMES
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
            gameId: { type: 'string', enum: SUPPORTED_GAMES },
            difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            runsPerModel: { type: 'number', minimum: 1, maximum: 10 }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: BenchmarkBody }>, reply: FastifyReply) => {
      const { gameId: rawGameId = 'mini-golf', difficulty = 'easy', runsPerModel = 3 } = request.body;
      const gameId = rawGameId as GameId;
      const gamePack = getGamePack(gameId);
      
      const results: BenchmarkResult[] = [];
      const modelIds = Object.keys(AVAILABLE_MODELS);

      for (const modelId of modelIds) {
        const modelConfig = AVAILABLE_MODELS[modelId];
        fastify.log.info({ gameId, modelId, modelName: modelConfig.name }, 'Benchmarking model');

        const latencies: number[] = [];
        const errors: string[] = [];
        let successes = 0;
        let failures = 0;

        for (let run = 0; run < runsPerModel; run++) {
          // Benchmark uses single-stage generation for speed
          const result = await generateLevel(gameId, difficulty, null, modelId);
          
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

          // Use game-specific validation
          const validation = gamePack.validate(result.level);
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
          gameId,
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
      supportedGames: SUPPORTED_GAMES,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * GET /pcg/levels/golden
   * Get curated golden levels for all games
   */
  fastify.get('/pcg/levels/golden', async (_request: FastifyRequest, reply: FastifyReply) => {
    const allLevels: Record<string, any[]> = {};
    
    for (const gameId of SUPPORTED_GAMES) {
      const pack = getGamePack(gameId);
      const goldenLevels = pack.getGoldenLevels();
      allLevels[gameId] = goldenLevels.map(level => ({
        gridLevel: level,
        validationReport: pack.validate(level),
        lintReport: pack.lint(level),
        signature: signLevel(level)
      }));
    }
    
    return reply.send({ levels: allLevels });
  });

  /**
   * GET /pcg/levels/golden/:gameId
   * Get curated golden levels for a specific game
   */
  fastify.get<{ Params: { gameId: string } }>(
    '/pcg/levels/golden/:gameId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['gameId'],
          properties: {
            gameId: { type: 'string', enum: SUPPORTED_GAMES }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { gameId: string } }>, reply: FastifyReply) => {
      const { gameId: rawGameId } = request.params;
      
      if (!SUPPORTED_GAMES.includes(rawGameId as GameId)) {
        return reply.status(400).send({
          error: 'Unsupported gameId',
          message: `Supported games: ${SUPPORTED_GAMES.join(', ')}`
        });
      }
      
      const gameId = rawGameId as GameId;
      const pack = getGamePack(gameId);
      const goldenLevels = pack.getGoldenLevels();
      
      return reply.send({
        gameId,
        levels: goldenLevels.map(level => ({
          gridLevel: level,
          validationReport: pack.validate(level),
          lintReport: pack.lint(level),
          signature: signLevel(level)
        }))
      });
    }
  );
}
