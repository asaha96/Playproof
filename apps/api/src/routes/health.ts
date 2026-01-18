/**
 * Health check routes
 * GET /health - Basic health check
 * GET /ready - Readiness check
 * GET /metrics - Woodwide observability metrics
 */

import type { FastifyInstance } from "fastify";
import { appConfig } from "../config.js";
import { observability } from "../services/observability.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.environment,
      woodwideConfigured: Boolean(appConfig.woodwide.apiKey),
    };
  });

  fastify.get("/ready", async () => {
    // Check if critical dependencies are ready
    const checks = {
      woodwide: Boolean(appConfig.woodwide.apiKey),
    };

    const allReady = Object.values(checks).every(Boolean);

    return {
      ready: allReady,
      checks,
    };
  });

  fastify.get("/metrics", async () => {
    const metrics = observability.getMetrics();
    return {
      ...metrics,
      successRate: observability.getSuccessRate(),
      timestamp: new Date().toISOString(),
      woodwideConfigured: !!appConfig.woodwide.anomalyModelId,
      modelId: appConfig.woodwide.anomalyModelId || null,
    };
  });
}
