/**
 * Configuration for PlayProof API
 * Loaded from environment variables
 */

export const appConfig = {
  // Server
  host: process.env.API_HOST ?? "0.0.0.0",
  port: parseInt(process.env.API_PORT ?? "3000", 10),
  environment: process.env.NODE_ENV ?? "development",

  // CORS
  corsOrigins: (process.env.API_CORS_ORIGINS ?? "http://localhost:3000,http://localhost:3001").split(","),

  // Woodwide ML Platform
  woodwide: {
    apiKey: process.env.WOODWIDE_API_KEY ?? "",
    baseUrl: process.env.WOODWIDE_BASE_URL ?? "https://beta.woodwide.ai",
    anomalyModelId: process.env.ANOMALY_MODEL_ID ?? "",
    persistentDatasetName: process.env.WOODWIDE_PERSISTENT_DATASET ?? "movement_live_inference",
  },

  // Scoring thresholds
  scoring: {
    thresholdPass: parseFloat(process.env.ANOMALY_THRESHOLD_PASS ?? "1.0"),
    thresholdReview: parseFloat(process.env.ANOMALY_THRESHOLD_REVIEW ?? "2.5"),
  },

  // Feature extraction parameters
  features: {
    minMovementEvents: 10,
    pauseThresholdMs: 200,
    jitterDistanceThreshold: 3.0, // pixels
    directionChangeAngleThreshold: 30, // degrees
  },
} as const;

export type AppConfig = typeof appConfig;
