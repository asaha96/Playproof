/**
 * Scoring Service
 * ===============
 * Orchestrates the scoring pipeline:
 * 1. Extract features from telemetry
 * 2. Call Woodwide for anomaly detection
 * 3. Apply decision logic with thresholds
 */

import type {
  SessionTelemetry,
  ScoringResponse,
  VerificationDecision,
  AnomalyResult,
  MovementFeatures,
} from "@playproof/shared";
import { extractFeatures, featuresToCsv } from "../lib/features.js";
import { WoodwideClient, MockWoodwideClient } from "./woodwide.js";
import { appConfig } from "../config.js";
import { sessionQueue } from "./batch/queue.js";
import { getSessionResult } from "./batch/inference.js";

// Initialize Woodwide client
const woodwideClient = appConfig.woodwide.apiKey
  ? new WoodwideClient(appConfig.woodwide.apiKey, appConfig.woodwide.baseUrl)
  : new MockWoodwideClient();

/**
 * Determine verification decision based on anomaly score
 *
 * Thresholds (from plan):
 * - score <= 1.0 → PASS (clearly human)
 * - 1.0 < score <= 2.5 → REVIEW (gray area)
 * - score > 2.5 → FAIL (highly suspicious)
 */
function determineDecision(anomalyScore: number): VerificationDecision {
  const { thresholdPass, thresholdReview } = appConfig.scoring;

  if (anomalyScore <= thresholdPass) {
    return "pass";
  } else if (anomalyScore <= thresholdReview) {
    return "review";
  } else {
    return "fail";
  }
}

/**
 * Calculate confidence based on how clearly the score falls into a bucket
 */
function calculateConfidence(anomalyScore: number): number {
  const { thresholdPass, thresholdReview } = appConfig.scoring;

  if (anomalyScore <= thresholdPass) {
    // Higher confidence for lower scores (clearly human)
    // Score 0 → confidence 1.0, score 1.0 → confidence 0.7
    return Math.max(0.7, 1.0 - anomalyScore * 0.3);
  } else if (anomalyScore <= thresholdReview) {
    // Lower confidence in the gray zone
    // Confidence ranges from 0.5 to 0.7
    const range = thresholdReview - thresholdPass;
    const position = (anomalyScore - thresholdPass) / range;
    return 0.7 - position * 0.2;
  } else {
    // Higher confidence for very high scores (clearly bot)
    // Score 2.5 → confidence 0.7, score 5+ → confidence 0.95
    const excess = anomalyScore - thresholdReview;
    return Math.min(0.95, 0.7 + excess * 0.1);
  }
}

/**
 * Create a summary of key features for explainability
 */
function createFeatureSummary(features: MovementFeatures): Record<string, number> {
  return {
    pathEfficiency: features.pathEfficiency,
    controlSmoothnessScore: features.controlSmoothnessScore,
    avgSpeed: features.avgSpeed,
    speedStd: features.speedStd,
    smallJitterRatio: features.smallJitterRatio,
    numDirectionChanges: features.numDirectionChanges,
    pauseTimeRatio: features.pauseTimeRatio,
    overshootEvents: features.overshootEvents,
    clickAccuracy: features.clickAccuracy,
  };
}

/**
 * Apply heuristic rules as additional signals
 * These run alongside the Woodwide model
 */
function applyHeuristicRules(features: MovementFeatures): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Unrealistically high path efficiency (perfect straight lines)
  if (features.pathEfficiency > 0.98 && features.totalMoves > 20) {
    reasons.push("Suspiciously high path efficiency");
  }

  // Zero or near-zero jitter (bots often have no micro-corrections)
  if (features.smallJitterRatio < 0.01 && features.totalMoves > 50) {
    reasons.push("Unnaturally smooth movement (no jitter)");
  }

  // Impossibly fast movements
  if (features.maxSpeed > 10000) {
    reasons.push("Impossibly fast movement speed");
  }

  // Perfect click accuracy with many clicks
  if (features.clickAccuracy === 1.0 && features.totalClicks > 10) {
    reasons.push("Perfect click accuracy (suspicious)");
  }

  // Too regular timing (constant intervals)
  if (features.interMoveTimeStd < 1 && features.totalMoves > 50) {
    reasons.push("Unnaturally regular movement timing");
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Queue a session for batch inference
 * Returns immediately with heuristic-based result, but also queues for Woodwide batch processing
 */
export async function scoreSessionWithBatch(
  telemetry: SessionTelemetry
): Promise<Omit<ScoringResponse, "latencyMs">> {
  // Step 1: Extract features
  const features = extractFeatures(telemetry);

  // Step 2: Apply heuristic rules
  const heuristics = applyHeuristicRules(features);

  // Step 3: Check if already processed in batch
  const batchResult = getSessionResult(telemetry.sessionId);
  let anomalyResult: AnomalyResult;

  if (batchResult) {
    // Use batch result
    anomalyResult = {
      anomalyScore: batchResult.anomalyScore,
      isAnomaly: batchResult.isAnomaly,
      modelId: appConfig.woodwide.anomalyModelId || "heuristic_fallback",
      modelVersion: "v1",
    };
  } else {
    // Queue for batch processing and use heuristic fallback for now
    if (appConfig.woodwide.anomalyModelId) {
      sessionQueue.enqueue(telemetry.sessionId, telemetry, features);
      console.log(`[Scoring] Queued session ${telemetry.sessionId} for batch inference`);
    }
    anomalyResult = createFallbackAnomalyResult(features, heuristics);
  }

  // Boost anomaly score if heuristic rules are triggered
  let adjustedScore = anomalyResult.anomalyScore;
  if (heuristics.suspicious) {
    adjustedScore = Math.max(adjustedScore, 1.5);
    adjustedScore += heuristics.reasons.length * 0.3;
  }

  // Step 4: Determine final decision
  const decision = determineDecision(adjustedScore);
  const confidence = calculateConfidence(adjustedScore);

  // Step 5: Build response
  return {
    sessionId: telemetry.sessionId,
    decision,
    confidence,
    anomaly: {
      ...anomalyResult,
      anomalyScore: adjustedScore,
      isAnomaly: adjustedScore > appConfig.scoring.thresholdReview,
    },
    featureSummary: createFeatureSummary(features),
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Score a verification session
 * Main entry point for the scoring pipeline
 * Uses real-time inference (with fallback) or batch mode based on config
 */
export async function scoreSession(
  telemetry: SessionTelemetry,
  options?: { useBatch?: boolean }
): Promise<Omit<ScoringResponse, "latencyMs">> {
  // Use batch mode if requested
  if (options?.useBatch) {
    return scoreSessionWithBatch(telemetry);
  }
  // Step 1: Extract features
  const features = extractFeatures(telemetry);

  // Step 2: Apply heuristic rules
  const heuristics = applyHeuristicRules(features);

  // Step 3: Call Woodwide for anomaly detection
  let anomalyResult: AnomalyResult;

  if (appConfig.woodwide.anomalyModelId) {
    // Production: Use Woodwide with persistent dataset
    try {
      const csvData = featuresToCsv(features);
      const result = await woodwideClient.scoreSession(
        appConfig.woodwide.anomalyModelId,
        telemetry.sessionId,
        csvData,
        appConfig.woodwide.persistentDatasetName
      );

      anomalyResult = {
        anomalyScore: result.anomalyScore,
        isAnomaly: result.isAnomaly,
        modelId: appConfig.woodwide.anomalyModelId,
        modelVersion: "v1",
      };
    } catch (error) {
      // Fallback to heuristic-based scoring if Woodwide fails
      // This is expected for single-session inference as Woodwide may require
      // established datasets or batch processing
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only log as warning (not error) since this is a known limitation
      if (errorMessage.includes("Empty response")) {
        console.warn(`[Scoring] Woodwide inference unavailable (dataset processing), using heuristic fallback`);
      } else {
        console.error("Woodwide inference failed, using fallback:", errorMessage);
      }
      
      anomalyResult = createFallbackAnomalyResult(features, heuristics);
    }
  } else {
    // Development: Use heuristic-based fallback
    anomalyResult = createFallbackAnomalyResult(features, heuristics);
  }

  // Boost anomaly score if heuristic rules are triggered
  let adjustedScore = anomalyResult.anomalyScore;
  if (heuristics.suspicious) {
    adjustedScore = Math.max(adjustedScore, 1.5); // At least REVIEW
    adjustedScore += heuristics.reasons.length * 0.3;
  }

  // Step 4: Determine final decision
  const decision = determineDecision(adjustedScore);
  const confidence = calculateConfidence(adjustedScore);

  // Step 5: Build response
  return {
    sessionId: telemetry.sessionId,
    decision,
    confidence,
    anomaly: {
      ...anomalyResult,
      anomalyScore: adjustedScore,
      isAnomaly: adjustedScore > appConfig.scoring.thresholdReview,
    },
    featureSummary: createFeatureSummary(features),
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Create a fallback anomaly result using heuristics
 * Used when Woodwide is not configured or fails
 */
function createFallbackAnomalyResult(
  features: MovementFeatures,
  heuristics: { suspicious: boolean; reasons: string[] }
): AnomalyResult {
  // Calculate a heuristic-based anomaly score
  let score = 0;

  // Path efficiency (high efficiency is suspicious)
  if (features.pathEfficiency > 0.9) {
    score += (features.pathEfficiency - 0.9) * 5;
  }

  // Lack of smoothness variation (too smooth is suspicious)
  if (features.controlSmoothnessScore > 0.95) {
    score += 0.5;
  }

  // Lack of jitter (no micro-corrections)
  if (features.smallJitterRatio < 0.05) {
    score += 0.5;
  }

  // Too few direction changes
  if (features.directionChangeRate < 1 && features.durationMs > 3000) {
    score += 0.5;
  }

  // Heuristic rule violations
  score += heuristics.reasons.length * 0.5;

  // Apply some randomness to avoid being too predictable
  score += (Math.random() - 0.5) * 0.2;

  // Clamp score
  score = Math.max(0, Math.min(5, score));

  return {
    anomalyScore: score,
    isAnomaly: score > 2.0,
    modelId: "heuristic_fallback",
    modelVersion: "v1",
  };
}

/**
 * Get scoring service health status
 */
export function getScoringHealth(): {
  woodwideConfigured: boolean;
  modelId: string | null;
  thresholds: { pass: number; review: number };
} {
  return {
    woodwideConfigured: Boolean(appConfig.woodwide.apiKey),
    modelId: appConfig.woodwide.anomalyModelId || null,
    thresholds: {
      pass: appConfig.scoring.thresholdPass,
      review: appConfig.scoring.thresholdReview,
    },
  };
}
