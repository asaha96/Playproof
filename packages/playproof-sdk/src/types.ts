/**
 * PlayProof SDK Types
 * 
 * @packageDocumentation
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * Types of input events captured by the SDK
 */
export type EventType = 
  | 'pointerdown' 
  | 'pointermove' 
  | 'pointerup' 
  | 'wheel' 
  | 'keydown' 
  | 'keyup';

/**
 * A single input event captured during verification
 */
export interface InputEvent {
  /** Event type */
  type: EventType;
  /** High-precision timestamp (performance.now()) */
  timestamp: number;
  /** X coordinate in canvas space */
  x?: number;
  /** Y coordinate in canvas space */
  y?: number;
  /** Pointer pressure (0-1) */
  pressure?: number;
  /** Mouse button index */
  button?: number;
  /** Wheel delta X */
  deltaX?: number;
  /** Wheel delta Y */
  deltaY?: number;
  /** Key pressed */
  key?: string;
  /** Coalesced high-frequency events */
  coalesced?: CoalescedPoint[];
}

/**
 * A coalesced point from high-frequency pointer events
 */
export interface CoalescedPoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

// ============================================================================
// Batch & Transport Types
// ============================================================================

/**
 * A batch of input events
 */
export interface EventBatch {
  /** Unique attempt identifier */
  attemptId: string;
  /** Sequential batch index */
  batchIndex: number;
  /** Events in this batch */
  events: InputEvent[];
  /** Timestamp of first event */
  startTime: number;
  /** Timestamp of last event */
  endTime: number;
}

/**
 * A signed batch with hash chain verification
 */
export interface SignedBatch {
  /** The event batch */
  batch: EventBatch;
  /** Hash of this batch */
  hash: string;
  /** Hash of the previous batch */
  prevHash: string;
}

// ============================================================================
// Challenge & Result Types
// ============================================================================

/**
 * Response from creating a new challenge
 */
export interface ChallengeResponse {
  /** Unique attempt identifier */
  attemptId: string;
  /** Token for authenticating batch submissions */
  challengeToken: string;
  /** Seed for deterministic game generation */
  seed: number;
  /** Ruleset identifier */
  rulesetId: string;
  /** Time-to-live in seconds */
  ttl: number;
  /** URL for submitting batches */
  ingestUrl: string;
}

/**
 * Verification result status
 */
export type AttemptResult = 'pending' | 'pass' | 'fail' | 'regenerate';

/**
 * Response from checking attempt result
 */
export interface AttemptResultResponse {
  /** Attempt identifier */
  attemptId: string;
  /** Verification result */
  result: AttemptResult;
  /** Confidence score (0-1) */
  score?: number;
  /** Human-readable reason */
  reason?: string;
}

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Theme configuration for customizing appearance
 */
export interface PlayProofTheme {
  /** Primary brand color (e.g., '#6366f1') */
  primary?: string;
  /** Secondary/gradient color */
  secondary?: string;
  /** Container background color */
  background?: string;
  /** Game area surface color */
  surface?: string;
  /** Primary text color */
  text?: string;
  /** Muted/secondary text color */
  textMuted?: string;
  /** Accent color for highlights */
  accent?: string;
  /** Success state color */
  success?: string;
  /** Error state color */
  error?: string;
  /** Border color */
  border?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SDK Configuration options
 */
export interface PlayProofConfig {
  /** API base URL */
  apiUrl: string;
  /** Game duration in milliseconds (default: 3000) */
  gameDuration?: number;
  /** Batch emission interval in milliseconds (default: 500) */
  batchInterval?: number;
  /** Ring buffer duration in seconds (default: 5) */
  bufferDuration?: number;
  /** Confidence threshold for passing (0-1, default: 0.7) */
  confidenceThreshold?: number;
  /** Theme customization */
  theme?: PlayProofTheme;
  /** Enable debug mode */
  debug?: boolean;
  /** Custom logger */
  logger?: Logger;
}

/**
 * Required configuration with defaults applied
 */
export interface PlayProofConfigRequired {
  apiUrl: string;
  gameDuration: number;
  batchInterval: number;
  bufferDuration: number;
  confidenceThreshold: number;
  theme: PlayProofTheme;
  debug: boolean;
  logger: Logger;
}

// ============================================================================
// Callback Types
// ============================================================================

/**
 * Callback for event batch emission
 */
export type OnEventBatchCallback = (batch: SignedBatch) => void;

/**
 * Callback for attempt completion
 */
export type OnAttemptEndCallback = (result: AttemptResultResponse) => void;

/**
 * Callback for regeneration request
 */
export type OnRegenerateCallback = (reason: string) => void;

/**
 * Callback for errors
 */
export type OnErrorCallback = (error: Error) => void;

/**
 * Callback for progress updates
 */
export type OnProgressCallback = (progress: number) => void;

/**
 * Callback for game start
 */
export type OnStartCallback = () => void;

// ============================================================================
// Game Types
// ============================================================================

/**
 * Game configuration
 */
export interface GameConfig {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Background color */
  backgroundColor?: number;
  /** Random seed for deterministic generation */
  seed: number;
  /** Ruleset identifier */
  rulesetId: string;
}

// ============================================================================
// Lifecycle & Event Types
// ============================================================================

/**
 * SDK lifecycle state
 */
export type LifecycleState = 
  | 'idle' 
  | 'initializing' 
  | 'ready' 
  | 'playing' 
  | 'processing' 
  | 'complete' 
  | 'error';

/**
 * SDK event types
 */
export type SDKEventType = 
  | 'init'
  | 'ready'
  | 'start'
  | 'progress'
  | 'batch'
  | 'complete'
  | 'error'
  | 'retry'
  | 'regenerate';

/**
 * SDK event payload
 */
export interface SDKEvent<T = unknown> {
  type: SDKEventType;
  timestamp: number;
  data?: T;
}

// ============================================================================
// Logger Types
// ============================================================================

/**
 * Logger interface for custom logging
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

// ============================================================================
// Verification Result (for callbacks)
// ============================================================================

/**
 * Verification result passed to callbacks
 */
export interface VerificationResult {
  /** Whether verification passed */
  passed: boolean;
  /** Confidence score (0-1) */
  score: number;
  /** Required threshold */
  threshold: number;
  /** Result timestamp */
  timestamp: number;
  /** Detailed metrics */
  details: {
    /** Number of mouse movements captured */
    mouseMovementCount: number;
    /** Number of clicks captured */
    clickCount: number;
    /** Click accuracy (0-1) */
    accuracy: number;
  };
}

// ============================================================================
// Web Component Attributes
// ============================================================================

/**
 * Attributes for the play-proof-game web component
 */
export interface PlayProofGameElementAttributes {
  'api-url': string;
  'game-duration'?: string;
  'confidence-threshold'?: string;
  'theme-primary'?: string;
  'theme-secondary'?: string;
  'theme-background'?: string;
  'theme-surface'?: string;
  'theme-text'?: string;
  'theme-accent'?: string;
  'theme-success'?: string;
  'theme-error'?: string;
  'debug'?: string;
}
