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

/** Scoring response from the scoring service */
export interface ScoringResponse {
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
