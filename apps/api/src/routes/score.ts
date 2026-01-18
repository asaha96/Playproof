/**
 * Scoring routes
 * POST /api/v1/score - Score a verification session
 */

import type { FastifyInstance } from "fastify";
import { scoreSession } from "../services/scoring.js";
import type { SessionTelemetry, ScoringResponse } from "@playproof/shared";

interface ScoreRequestBody {
  sessionId: string;
  gameType: "bubble-pop" | "archery" | "mini-golf";
  deviceType: "mouse" | "touch" | "trackpad";
  durationMs: number;
  movements: Array<{ x: number; y: number; timestamp: number }>;
  clicks: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
  hits: number;
  misses: number;
  userId?: string;
  deploymentId?: string;
}

export async function scoreRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ScoreRequestBody }>("/score", async (request, reply) => {
    const startTime = performance.now();

    try {
      const {
        sessionId,
        gameType,
        deviceType,
        durationMs,
        movements,
        clicks,
        hits,
        misses,
        userId,
        deploymentId,
      } = request.body;

      // Validate required fields
      if (!sessionId || !movements || movements.length === 0) {
        return reply.status(400).send({
          error: "Missing required fields: sessionId and movements are required",
        });
      }

      // Build telemetry object
      const telemetry: SessionTelemetry = {
        sessionId,
        userId,
        deploymentId,
        gameType: gameType ?? "unknown",
        deviceType: deviceType ?? "unknown",
        durationMs: durationMs ?? 0,
        movements: movements.map((m) => ({
          x: m.x,
          y: m.y,
          timestamp: m.timestamp,
          isTrusted: true,
        })),
        clicks: clicks?.map((c) => ({
          x: c.x,
          y: c.y,
          timestamp: c.timestamp,
          targetHit: c.targetHit,
        })) ?? [],
        hits: hits ?? 0,
        misses: misses ?? 0,
      };

      // Score the session
      const result = await scoreSession(telemetry);

      const latencyMs = performance.now() - startTime;

      const response: ScoringResponse = {
        ...result,
        latencyMs,
      };

      return response;
    } catch (error) {
      fastify.log.error(error, "Scoring failed");
      return reply.status(500).send({
        error: "Scoring failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
