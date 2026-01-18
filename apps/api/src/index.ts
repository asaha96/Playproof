/**
 * PlayProof API Server
 * Fastify-based API orchestrator with Woodwide scoring integration
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import { appConfig } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { scoreRoutes } from "./routes/score.js";
import { trainingRoutes } from "./routes/training.js";
import { batchRoutes } from "./routes/batch.js";
import { batchScheduler } from "./services/batch/scheduler.js";

const fastify = Fastify({
  logger: {
    level: appConfig.environment === "development" ? "info" : "warn",
  },
});

// Register CORS
await fastify.register(cors, {
  origin: appConfig.corsOrigins,
  credentials: true,
});

// Register routes
await fastify.register(healthRoutes);
await fastify.register(scoreRoutes, { prefix: "/api/v1" });
await fastify.register(trainingRoutes, { prefix: "/api/v1" });
await fastify.register(batchRoutes, { prefix: "/api/v1" });

// Root endpoint
fastify.get("/", async () => {
  return {
    service: "playproof-api",
    version: "0.1.0",
    status: "operational",
    docs: "/docs",
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ host: appConfig.host, port: appConfig.port });
    console.log(`🚀 PlayProof API running at http://${appConfig.host}:${appConfig.port}`);
    console.log(`   Environment: ${appConfig.environment}`);
    console.log(`   Woodwide configured: ${Boolean(appConfig.woodwide.apiKey)}`);
    
    // Start batch scheduler
    batchScheduler.start();
    console.log(`   Batch scheduler: started`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
