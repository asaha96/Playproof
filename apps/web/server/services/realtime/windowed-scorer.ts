/**
 * Windowed Scorer Service
 * =======================
 * Scores 0.5s windows of telemetry events with 0.1s overlap.
 * Uses existing feature extraction and heuristic scoring logic.
 */

import type { MovementFeatures, VerificationDecision } from "@playproof/shared";
import { extractFeatures } from "@/server/lib/features";
import { agentConfig } from "./config";

/**
 * Pointer telemetry event - matches SDK definition
 */
export interface PointerTelemetryEvent {
  timestampMs: number;
  tMs: number;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  isDown: boolean;
  eventType: "move" | "down" | "up" | "enter" | "leave";
  pointerType: string;
  pointerId: number;
  isTrusted: boolean;
}

/**
 * Result of scoring a single window
 */
export interface WindowScore {
  windowId: number;
  startMs: number;
  endMs: number;
  decision: VerificationDecision;
  confidence: number;
  anomalyScore: number;
  eventCount: number;
  features?: Partial<MovementFeatures>;
}

/**
 * Convert PointerTelemetryEvent[] to SessionTelemetry format for feature extraction
 */
function eventsToSessionTelemetry(
  events: PointerTelemetryEvent[],
  windowId: number
): {
  sessionId: string;
  userId: string;
  gameType: string;
  deviceType: string;
  durationMs: number;
  movements: Array<{ x: number; y: number; timestamp: number }>;
  clicks: Array<{ x: number; y: number; timestamp: number }>;
  hits: number;
  misses: number;
} {
  const movements = events
    .filter((e) => e.eventType === "move" || e.eventType === "down" || e.eventType === "up")
    .map((e) => ({
      x: e.x,
      y: e.y,
      timestamp: e.timestampMs,
    }));

  const clicks = events
    .filter((e) => e.eventType === "down")
    .map((e) => ({
      x: e.x,
      y: e.y,
      timestamp: e.timestampMs,
    }));

  const durationMs =
    events.length >= 2 ? events[events.length - 1].timestampMs - events[0].timestampMs : 0;

  return {
    sessionId: `window_${windowId}`,
    userId: "unknown",
    gameType: "unknown",
    deviceType: events[0]?.pointerType || "unknown",
    durationMs,
    movements,
    clicks,
    hits: 0,
    misses: 0,
  };
}

/**
 * Apply heuristic rules to determine anomaly score
 * Adapted from scoring.ts for windowed analysis
 */
function calculateWindowAnomalyScore(features: MovementFeatures): number {
  let score = 0;

  // Path efficiency (high efficiency is suspicious)
  if (features.pathEfficiency > 0.95) {
    score += (features.pathEfficiency - 0.9) * 5;
  }

  // Lack of smoothness variation (too smooth is suspicious)
  if (features.controlSmoothnessScore > 0.98) {
    score += 0.5;
  }

  // Lack of jitter (no micro-corrections)
  if (features.smallJitterRatio < 0.02 && features.totalMoves > 5) {
    score += 0.5;
  }

  // Too few direction changes
  if (features.directionChangeRate < 0.5 && features.durationMs > 300) {
    score += 0.3;
  }

  // Unnaturally regular movement timing
  if (features.interMoveTimeStd < 2 && features.totalMoves > 10) {
    score += 0.5;
  }

  // Impossibly fast movements
  if (features.maxSpeed > 8000) {
    score += 1.0;
  }

  return Math.max(0, Math.min(5, score));
}

/**
 * Determine decision based on anomaly score
 */
function determineDecision(anomalyScore: number): VerificationDecision {
  if (anomalyScore <= agentConfig.thresholdPass) {
    return "pass";
  } else if (anomalyScore <= agentConfig.thresholdReview) {
    return "review";
  } else {
    return "fail";
  }
}

/**
 * Calculate confidence based on score clarity
 */
function calculateConfidence(anomalyScore: number): number {
  const { thresholdPass, thresholdReview } = agentConfig;

  if (anomalyScore <= thresholdPass) {
    return Math.max(0.7, 1.0 - anomalyScore * 0.3);
  } else if (anomalyScore <= thresholdReview) {
    const range = thresholdReview - thresholdPass;
    const position = (anomalyScore - thresholdPass) / range;
    return 0.7 - position * 0.2;
  } else {
    const excess = anomalyScore - thresholdReview;
    return Math.min(0.95, 0.7 + excess * 0.1);
  }
}

/**
 * Score a single window of telemetry events
 */
export function scoreWindow(
  windowEvents: PointerTelemetryEvent[],
  windowId: number,
  startMs: number,
  endMs: number,
  scoringEvents: PointerTelemetryEvent[] = windowEvents
): WindowScore {
  // Insufficient events for reliable scoring
  if (windowEvents.length < agentConfig.minEventsPerWindow) {
    return {
      windowId,
      startMs,
      endMs,
      decision: "review",
      confidence: 0.3,
      anomalyScore: 1.5,
      eventCount: windowEvents.length,
    };
  }

  // Convert to session telemetry format
  const telemetry = eventsToSessionTelemetry(scoringEvents, windowId);

  // Extract features
  const features = extractFeatures(telemetry);

  // Calculate anomaly score
  const anomalyScore = calculateWindowAnomalyScore(features);

  // Determine decision
  const decision = determineDecision(anomalyScore);
  const confidence = calculateConfidence(anomalyScore);

  return {
    windowId,
    startMs,
    endMs,
    decision,
    confidence,
    anomalyScore,
    eventCount: windowEvents.length,
    features: {
      pathEfficiency: features.pathEfficiency,
      controlSmoothnessScore: features.controlSmoothnessScore,
      smallJitterRatio: features.smallJitterRatio,
      avgSpeed: features.avgSpeed,
      maxSpeed: features.maxSpeed,
      directionChangeRate: features.directionChangeRate,
      interMoveTimeStd: features.interMoveTimeStd,
    },
  };
}

/**
 * Extract events for a window from a buffer
 * Returns events with timestamps in [startMs, endMs)
 */
export function extractWindowEvents(
  buffer: PointerTelemetryEvent[],
  startMs: number,
  endMs: number
): PointerTelemetryEvent[] {
  return buffer.filter((e) => e.timestampMs >= startMs && e.timestampMs < endMs);
}

/**
 * Windowed Scorer Manager
 * Maintains window state and produces overlapping windows
 */
export class WindowedScorer {
  private windowId = 0;
  private lastWindowEndMs = 0;
  private sessionStartMs: number;

  constructor(sessionStartMs: number) {
    this.sessionStartMs = sessionStartMs;
    this.lastWindowEndMs = sessionStartMs;
  }

  /**
   * Generate windows from the event buffer
   * Returns array of windows that can be scored
   */
  generateWindows(
    buffer: PointerTelemetryEvent[],
    currentMs: number
  ): Array<{ events: PointerTelemetryEvent[]; startMs: number; endMs: number; windowId: number }> {
    const windows: Array<{
      events: PointerTelemetryEvent[];
      startMs: number;
      endMs: number;
      windowId: number;
    }> = [];

    // Calculate the next window that can be completed
    const windowDuration = agentConfig.windowDurationMs;
    const overlap = agentConfig.windowOverlapMs;
    const step = windowDuration - overlap;

    // Generate all windows that end before or at currentMs
    while (this.lastWindowEndMs + windowDuration <= currentMs) {
      const startMs = this.lastWindowEndMs;
      const endMs = startMs + windowDuration;

      const events = extractWindowEvents(buffer, startMs, endMs);

      windows.push({
        events,
        startMs,
        endMs,
        windowId: this.windowId++,
      });

      // Move by step (window - overlap) for overlapping windows
      this.lastWindowEndMs = startMs + step;
    }

    return windows;
  }

  /**
   * Score all pending windows from the buffer
   */
  scoreWindows(buffer: PointerTelemetryEvent[], currentMs: number): WindowScore[] {
    const windows = this.generateWindows(buffer, currentMs);
    return windows.map((w) => scoreWindow(w.events, w.windowId, w.startMs, w.endMs));
  }

  /**
   * Score windows using cumulative session data (from session start to window end)
   */
  scoreWindowsCumulative(
    buffer: PointerTelemetryEvent[],
    historyBuffer: PointerTelemetryEvent[],
    currentMs: number
  ): WindowScore[] {
    const windows = this.generateWindows(buffer, currentMs);
    const sessionStartMs = historyBuffer[0]?.timestampMs ?? this.sessionStartMs;
    return windows.map((w) => {
      const cumulativeEvents = extractWindowEvents(
        historyBuffer,
        sessionStartMs,
        w.endMs
      );
      return scoreWindow(w.events, w.windowId, w.startMs, w.endMs, cumulativeEvents);
    });
  }

  /**
   * Get the last processed window end time (for buffer cleanup)
   */
  getLastWindowEndMs(): number {
    return this.lastWindowEndMs - agentConfig.windowOverlapMs; // Keep overlap for next window
  }

  /**
   * Reset the scorer state
   */
  reset(newSessionStartMs: number): void {
    this.windowId = 0;
    this.lastWindowEndMs = newSessionStartMs;
    this.sessionStartMs = newSessionStartMs;
  }
}
