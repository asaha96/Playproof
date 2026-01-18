/**
 * Feature Extraction Module
 * =========================
 * Converts raw movement telemetry → MovementFeatures for Woodwide scoring.
 *
 * Implements the feature engineering plan:
 * 1. Compute kinematics (velocity, acceleration, jerk)
 * 2. Compute path metrics (efficiency, direction changes, jitter)
 * 3. Aggregate session statistics
 */

import type { SessionTelemetry, MovementFeatures, TelemetryMovement } from "@playproof/shared";
import { appConfig } from "@/server/config";

const FEATURE_CONFIG = appConfig.features;

/**
 * Euclidean distance between two points
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Angle in degrees between two velocity vectors
 */
function angleBetweenVectors(
  v1: { x: number; y: number },
  v2: { x: number; y: number }
): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

  if (mag1 < 1e-9 || mag2 < 1e-9) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Compute mean of an array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Compute standard deviation of an array
 */
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Compute median of an array
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute percentile of an array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

interface Kinematics {
  velocities: number[];
  accelerations: number[];
  jerks: number[];
}

/**
 * Compute velocity, acceleration, jerk from movement events
 */
function computeKinematics(movements: TelemetryMovement[]): Kinematics {
  if (movements.length < 2) {
    return { velocities: [], accelerations: [], jerks: [] };
  }

  const velocities: number[] = [];
  const accelerations: number[] = [];
  const jerks: number[] = [];

  // Compute velocities
  for (let i = 1; i < movements.length; i++) {
    const dt = movements[i].timestamp - movements[i - 1].timestamp;
    if (dt < 0.001) continue; // Skip if time delta too small

    const dist = distance(movements[i - 1], movements[i]);
    // Convert to px/s (timestamps are in ms)
    const velocity = (dist / dt) * 1000;
    velocities.push(velocity);
  }

  // Compute accelerations
  for (let i = 1; i < velocities.length; i++) {
    const dt = movements[i + 1].timestamp - movements[i].timestamp;
    if (dt < 0.001) continue;

    const dv = velocities[i] - velocities[i - 1];
    const acceleration = (dv / dt) * 1000;
    accelerations.push(Math.abs(acceleration));
  }

  // Compute jerks
  for (let i = 1; i < accelerations.length; i++) {
    const dt = movements[i + 2].timestamp - movements[i + 1].timestamp;
    if (dt < 0.001) continue;

    const da = accelerations[i] - accelerations[i - 1];
    const jerk = (da / dt) * 1000;
    jerks.push(Math.abs(jerk));
  }

  return { velocities, accelerations, jerks };
}

/**
 * Count significant direction changes (turns above threshold angle)
 */
function countDirectionChanges(
  movements: TelemetryMovement[],
  angleThreshold: number
): number {
  if (movements.length < 3) return 0;

  let changes = 0;
  for (let i = 1; i < movements.length - 1; i++) {
    const v1 = {
      x: movements[i].x - movements[i - 1].x,
      y: movements[i].y - movements[i - 1].y,
    };
    const v2 = {
      x: movements[i + 1].x - movements[i].x,
      y: movements[i + 1].y - movements[i].y,
    };
    const angle = angleBetweenVectors(v1, v2);
    if (angle > angleThreshold) {
      changes++;
    }
  }

  return changes;
}

/**
 * Compute jitter ratio - fraction of path with tiny oscillatory movements
 */
function computeJitterRatio(
  movements: TelemetryMovement[],
  jitterThreshold: number
): number {
  if (movements.length < 3) return 0;

  let jitterCount = 0;
  for (let i = 1; i < movements.length - 1; i++) {
    const d1 = distance(movements[i - 1], movements[i]);
    const d2 = distance(movements[i], movements[i + 1]);

    // Small movement followed by small movement = jitter
    if (d1 < jitterThreshold && d2 < jitterThreshold) {
      jitterCount++;
    }
  }

  return jitterCount / (movements.length - 2);
}

/**
 * Compute path efficiency = beeline distance / actual path length
 * Humans tend to have lower efficiency (curved, hesitant paths)
 * Bots often have very high efficiency (straight lines)
 */
function computePathEfficiency(movements: TelemetryMovement[]): number {
  if (movements.length < 2) return 1.0;

  // Beeline: start to end
  const beeline = distance(movements[0], movements[movements.length - 1]);

  // Actual path length
  let totalDistance = 0;
  for (let i = 1; i < movements.length; i++) {
    totalDistance += distance(movements[i - 1], movements[i]);
  }

  if (totalDistance < 1e-9) return 1.0;

  return Math.min(1.0, beeline / totalDistance);
}

/**
 * Compute total path distance
 */
function computeTotalDistance(movements: TelemetryMovement[]): number {
  let total = 0;
  for (let i = 1; i < movements.length; i++) {
    total += distance(movements[i - 1], movements[i]);
  }
  return total;
}

interface PauseStats {
  numPauses: number;
  pauseTimeRatio: number;
  avgPauseDuration: number;
}

/**
 * Count pauses and compute pause statistics
 */
function computePauses(
  movements: TelemetryMovement[],
  pauseThresholdMs: number
): PauseStats {
  if (movements.length < 2) {
    return { numPauses: 0, pauseTimeRatio: 0, avgPauseDuration: 0 };
  }

  const pauses: number[] = [];
  for (let i = 1; i < movements.length; i++) {
    const dt = movements[i].timestamp - movements[i - 1].timestamp;
    if (dt > pauseThresholdMs) {
      pauses.push(dt);
    }
  }

  if (pauses.length === 0) {
    return { numPauses: 0, pauseTimeRatio: 0, avgPauseDuration: 0 };
  }

  const totalTime = movements[movements.length - 1].timestamp - movements[0].timestamp;
  if (totalTime < 1e-9) {
    return { numPauses: pauses.length, pauseTimeRatio: 0, avgPauseDuration: 0 };
  }

  const totalPauseTime = pauses.reduce((a, b) => a + b, 0);

  return {
    numPauses: pauses.length,
    pauseTimeRatio: totalPauseTime / totalTime,
    avgPauseDuration: mean(pauses),
  };
}

/**
 * Count overshoot events - sharp direction reversals (>120°)
 */
function countOvershoots(movements: TelemetryMovement[]): number {
  if (movements.length < 3) return 0;

  let overshoots = 0;
  for (let i = 1; i < movements.length - 1; i++) {
    const v1 = {
      x: movements[i].x - movements[i - 1].x,
      y: movements[i].y - movements[i - 1].y,
    };
    const v2 = {
      x: movements[i + 1].x - movements[i].x,
      y: movements[i + 1].y - movements[i].y,
    };
    const angle = angleBetweenVectors(v1, v2);
    if (angle > 120) {
      overshoots++;
    }
  }

  return overshoots;
}

/**
 * Compute control smoothness score = 1 - normalized_jerk
 * Higher = smoother movement (more human-like)
 */
function computeSmoothness(jerks: number[], durationMs: number): number {
  if (jerks.length === 0 || durationMs < 1e-9) return 0.5;

  const jerkMagnitude = mean(jerks);
  // Empirical normalization
  const normalized = jerkMagnitude / (10000 + jerkMagnitude);
  return 1.0 - normalized;
}

/**
 * Compute inter-movement timing statistics
 */
function computeInterMoveTiming(movements: TelemetryMovement[]): {
  avgInterMoveTime: number;
  interMoveTimeStd: number;
} {
  if (movements.length < 2) {
    return { avgInterMoveTime: 0, interMoveTimeStd: 0 };
  }

  const interTimes: number[] = [];
  for (let i = 1; i < movements.length; i++) {
    interTimes.push(movements[i].timestamp - movements[i - 1].timestamp);
  }

  return {
    avgInterMoveTime: mean(interTimes),
    interMoveTimeStd: std(interTimes),
  };
}

/**
 * Extract MovementFeatures from raw SessionTelemetry
 * This is the main entry point for feature extraction.
 */
export function extractFeatures(telemetry: SessionTelemetry): MovementFeatures {
  const { movements, clicks, hits, misses } = telemetry;

  // Handle empty or very short sessions
  if (movements.length < FEATURE_CONFIG.minMovementEvents) {
    return createMinimalFeatures(telemetry);
  }

  // Compute kinematics
  const { velocities, accelerations, jerks } = computeKinematics(movements);

  // Speed statistics
  const avgSpeed = mean(velocities);
  const maxSpeed = velocities.length > 0 ? Math.max(...velocities) : 0;
  const medianSpeed = median(velocities);
  const speedStd = std(velocities);
  const speedP95 = percentile(velocities, 95);

  // Acceleration statistics
  const avgAccel = mean(accelerations);
  const maxAccel = accelerations.length > 0 ? Math.max(...accelerations) : 0;
  const accelStd = std(accelerations);

  // Jerk statistics
  const jerkStd = std(jerks);
  const avgJerk = mean(jerks);

  // Path metrics
  const numDirectionChanges = countDirectionChanges(
    movements,
    FEATURE_CONFIG.directionChangeAngleThreshold
  );
  const directionChangeRate =
    telemetry.durationMs > 0
      ? numDirectionChanges / (telemetry.durationMs / 1000)
      : 0;

  const smallJitterRatio = computeJitterRatio(
    movements,
    FEATURE_CONFIG.jitterDistanceThreshold
  );
  const pathEfficiency = computePathEfficiency(movements);
  const totalDistance = computeTotalDistance(movements);

  // Pause statistics
  const pauseStats = computePauses(movements, FEATURE_CONFIG.pauseThresholdMs);

  // Overshoot events
  const overshootEvents = countOvershoots(movements);

  // Click accuracy
  const clickAccuracy =
    hits + misses > 0 ? hits / (hits + misses) : 0;

  // Smoothness
  const controlSmoothnessScore = computeSmoothness(jerks, telemetry.durationMs);

  // Inter-movement timing
  const timingStats = computeInterMoveTiming(movements);

  return {
    sessionId: telemetry.sessionId,
    userId: telemetry.userId,
    gameType: telemetry.gameType,
    deviceType: telemetry.deviceType,
    durationMs: telemetry.durationMs,
    totalMoves: movements.length,
    totalClicks: clicks.length,

    // Speed
    avgSpeed,
    maxSpeed,
    medianSpeed,
    speedStd,
    speedP95,

    // Acceleration
    avgAccel,
    maxAccel,
    accelStd,

    // Jerk
    jerkStd,
    avgJerk,

    // Path
    numDirectionChanges,
    directionChangeRate,
    smallJitterRatio,
    pathEfficiency,
    totalDistance,

    // Pauses
    numPausesOver200ms: pauseStats.numPauses,
    pauseTimeRatio: pauseStats.pauseTimeRatio,
    avgPauseDuration: pauseStats.avgPauseDuration,

    // Interaction
    overshootEvents,
    clickAccuracy,
    avgClickDistance: 0, // Requires target positions

    // Smoothness
    controlSmoothnessScore,
    curvatureVariance: 0, // TODO: implement

    // Timing
    avgInterMoveTime: timingStats.avgInterMoveTime,
    interMoveTimeStd: timingStats.interMoveTimeStd,
  };
}

/**
 * Create minimal features for very short sessions
 */
function createMinimalFeatures(telemetry: SessionTelemetry): MovementFeatures {
  return {
    sessionId: telemetry.sessionId,
    userId: telemetry.userId,
    gameType: telemetry.gameType,
    deviceType: telemetry.deviceType,
    durationMs: telemetry.durationMs,
    totalMoves: telemetry.movements.length,
    totalClicks: telemetry.clicks.length,
    avgSpeed: 0,
    maxSpeed: 0,
    medianSpeed: 0,
    speedStd: 0,
    speedP95: 0,
    avgAccel: 0,
    maxAccel: 0,
    accelStd: 0,
    jerkStd: 0,
    avgJerk: 0,
    numDirectionChanges: 0,
    directionChangeRate: 0,
    smallJitterRatio: 0,
    pathEfficiency: 1.0,
    totalDistance: 0,
    numPausesOver200ms: 0,
    pauseTimeRatio: 0,
    avgPauseDuration: 0,
    overshootEvents: 0,
    clickAccuracy: 0,
    avgClickDistance: 0,
    controlSmoothnessScore: 0.5,
    curvatureVariance: 0,
    avgInterMoveTime: 0,
    interMoveTimeStd: 0,
  };
}

/**
 * Convert MovementFeatures to CSV row format for Woodwide
 */
export function featuresToCsvRow(features: MovementFeatures): Record<string, string | number> {
  const { userId, ...rest } = features;
  return rest;
}

/**
 * Convert MovementFeatures to CSV string
 */
export function featuresToCsv(features: MovementFeatures): string {
  const row = featuresToCsvRow(features);
  const headers = Object.keys(row);
  const values = Object.values(row);

  const headerLine = headers.join(",");
  const valueLine = values.map((v) => (typeof v === "string" ? `"${v}"` : v)).join(",");

  return `${headerLine}\n${valueLine}`;
}
