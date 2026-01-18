/**
 * Batch Inference Routes
 * ======================
 * Endpoints for managing batch inference
 */

import type { FastifyInstance } from "fastify";
import { batchScheduler } from "../services/batch/scheduler.js";
import { processBatch, getBatchStats, getSessionResult } from "../services/batch/inference.js";
import { sessionQueue } from "../services/batch/queue.js";

export async function batchRoutes(fastify: FastifyInstance) {
  // Get batch queue stats
  fastify.get("/batch/stats", async () => {
    const stats = getBatchStats();
    const schedulerStatus = batchScheduler.getStatus();

    return {
      queue: stats,
      scheduler: {
        running: schedulerStatus.running,
        isProcessing: schedulerStatus.isProcessing,
        lastProcessed: schedulerStatus.lastProcessed
          ? new Date(schedulerStatus.lastProcessed).toISOString()
          : null,
      },
    };
  });

  // Manually trigger batch processing
  fastify.post("/batch/process", async (request, reply) => {
    try {
      const result = await processBatch();
      return {
        ...result,
        message: `Processed ${result.processed} sessions`,
      };
    } catch (error) {
      fastify.log.error(error, "Batch processing failed");
      return reply.status(500).send({
        error: "Batch processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get result for a specific session
  fastify.get<{ Params: { sessionId: string } }>("/batch/result/:sessionId", async (request) => {
    const { sessionId } = request.params;
    const result = getSessionResult(sessionId);

    if (!result) {
      // Check if session is in queue but not processed
      if (sessionQueue.has(sessionId)) {
        return {
          sessionId,
          status: "queued",
          message: "Session is queued but not yet processed",
        };
      }

      return {
        sessionId,
        status: "not_found",
        message: "Session not found in queue",
      };
    }

    return {
      sessionId,
      status: "processed",
      result,
    };
  });

  // Start/stop scheduler
  fastify.post("/batch/scheduler/start", async () => {
    batchScheduler.start();
    return {
      success: true,
      message: "Batch scheduler started",
      status: batchScheduler.getStatus(),
    };
  });

  fastify.post("/batch/scheduler/stop", async () => {
    batchScheduler.stop();
    return {
      success: true,
      message: "Batch scheduler stopped",
    };
  });

  fastify.get("/batch/scheduler/status", async () => {
    return batchScheduler.getStatus();
  });

  // Clear queue (admin only - for testing)
  fastify.post("/batch/clear", async () => {
    sessionQueue.clear();
    return {
      success: true,
      message: "Queue cleared",
    };
  });
}
