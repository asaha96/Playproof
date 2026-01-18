/**
 * Shared type definitions for PlayProof
 */

/** Mouse/pointer movement data point */
export interface MovementPoint {
  x: number;
  y: number;
  timestamp: number;
}

/** Verification event types */
export type VerificationEventType = 'mousemove' | 'click' | 'keypress' | 'scroll' | 'touch';

/** Verification event structure */
export interface VerificationEvent {
  type: VerificationEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/** Scoring request sent to the scoring service */
export interface ScoringRequest {
  sessionId: string;
  events: VerificationEvent[];
}

/** Verification result types */
export type VerificationResultType = 'PASS' | 'FAIL' | 'REGENERATE' | 'STEP_UP';

/** Legacy scoring response (deprecated, use ScoringResponse instead) */
export interface LegacyScoringResponse {
  result: VerificationResultType;
  confidence: number;
  details?: Record<string, unknown>;
}

/** Behavior data collected during verification game */
export interface BehaviorData {
  mouseMovements: MovementPoint[];
  clickTimings: number[];
  trajectories: MovementPoint[][];
  hits: number;
  misses: number;
  clickAccuracy?: number;
}

/** Theme configuration for the SDK */
export interface PlayproofTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  success: string;
  error: string;
  border: string;
}

/** Verification result returned by the SDK */
export interface PlayproofVerificationResult {
  passed: boolean;
  score: number;
  threshold: number;
  timestamp: number;
  details: {
    mouseMovementCount: number;
    clickCount: number;
    accuracy: number;
  };
}

/** SDK configuration options */
export interface PlayproofConfig {
  containerId: string;
  theme: PlayproofTheme;
  confidenceThreshold: number;
  gameDuration: number;
  onSuccess: ((result: PlayproofVerificationResult) => void) | null;
  onFailure: ((result: PlayproofVerificationResult) => void) | null;
  onStart: (() => void) | null;
  onProgress: ((progress: number) => void) | null;
}

/** User-provided partial configuration */
export type PlayproofUserConfig = Partial<Omit<PlayproofConfig, 'theme'>> & {
  theme?: Partial<PlayproofTheme>;
};

// ============================================================================
// Scoring Types (Woodwide Integration)
// ============================================================================

/** Verification decision from scoring */
export type VerificationDecision = 'pass' | 'review' | 'fail';

/** Game types for scoring */
export type GameType = 'bubble-pop' | 'osu' | 'snake' | 'unknown';

/** Device types for scoring */
export type DeviceType = 'mouse' | 'touch' | 'trackpad' | 'stylus' | 'unknown';

/** Movement event in session telemetry */
export interface TelemetryMovement {
  x: number;
  y: number;
  timestamp: number;
  isTrusted: boolean;
}

/** Click event in session telemetry */
export interface TelemetryClick {
  x: number;
  y: number;
  timestamp: number;
  targetHit: boolean;
}

/**
 * Raw telemetry from a PlayProof verification session.
 * This is what the SDK sends to the scoring service.
 */
export interface SessionTelemetry {
  sessionId: string;
  userId?: string;
  deploymentId?: string;

  // Game context
  gameType: GameType;
  deviceType: DeviceType;

  // Timing
  durationMs: number;

  // Raw events
  movements: TelemetryMovement[];
  clicks: TelemetryClick[];

  // Game results
  hits: number;
  misses: number;
}

/**
 * Extracted features from movement telemetry.
 * One row per session, sent to Woodwide for anomaly scoring.
 * 
 * Based on the Woodwide integration plan feature schema.
 */
export interface MovementFeatures {
  sessionId: string;

  // Identifiers (tracked but not used for scoring)
  userId?: string;
  gameType: string;
  deviceType: string;

  // Duration & volume
  durationMs: number;
  totalMoves: number;
  totalClicks: number;

  // Speed metrics (px/s)
  avgSpeed: number;
  maxSpeed: number;
  medianSpeed: number;
  speedStd: number;
  speedP95: number;

  // Acceleration metrics (px/s²)
  avgAccel: number;
  maxAccel: number;
  accelStd: number;

  // Jerk metrics (derivative of acceleration)
  jerkStd: number;
  avgJerk: number;

  // Path characteristics
  numDirectionChanges: number;
  directionChangeRate: number;
  smallJitterRatio: number;
  pathEfficiency: number;
  totalDistance: number;

  // Pauses and hesitations
  numPausesOver200ms: number;
  pauseTimeRatio: number;
  avgPauseDuration: number;

  // Target interaction
  overshootEvents: number;
  clickAccuracy: number;
  avgClickDistance: number;

  // Smoothness
  controlSmoothnessScore: number;
  curvatureVariance: number;

  // Timing patterns
  avgInterMoveTime: number;
  interMoveTimeStd: number;
}

/** Anomaly result from Woodwide */
export interface AnomalyResult {
  anomalyScore: number;
  isAnomaly: boolean;
  modelId: string;
  modelVersion: string;
}

/** Prediction result from Woodwide (Phase 2) */
export interface PredictionResult {
  botProbability: number;
  modelId: string;
  modelVersion: string;
}

/**
 * Complete scoring response for a session.
 */
export interface ScoringResponse {
  sessionId: string;

  // Final decision
  decision: VerificationDecision;
  confidence: number;

  // Woodwide results
  anomaly: AnomalyResult;
  prediction?: PredictionResult;

  // Key features for debugging/explainability
  featureSummary: Record<string, number>;

  // Metadata
  scoredAt: string;
  latencyMs: number;
}

/** Training status from Woodwide */
export interface TrainingStatus {
  modelId: string;
  modelName: string;
  status: 'PENDING' | 'TRAINING' | 'COMPLETE' | 'FAILED';
  progress?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/** Dataset upload response */
export interface DatasetUploadResult {
  datasetId: string;
  datasetName: string;
  rowCount: number;
  columns: string[];
}
