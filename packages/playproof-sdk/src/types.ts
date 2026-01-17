// PlayProof SDK Types

export type EventType = 
  | 'pointerdown' 
  | 'pointermove' 
  | 'pointerup' 
  | 'wheel' 
  | 'keydown' 
  | 'keyup';

export interface InputEvent {
  type: EventType;
  timestamp: number; // performance.now() value
  x?: number;        // canvas-space X coordinate
  y?: number;        // canvas-space Y coordinate
  pressure?: number;
  button?: number;
  deltaX?: number;   // for wheel events
  deltaY?: number;   // for wheel events
  key?: string;      // for keyboard events
  coalesced?: Array<{ x: number; y: number; timestamp: number; pressure?: number }>;
}

export interface EventBatch {
  attemptId: string;
  batchIndex: number;
  events: InputEvent[];
  startTime: number;
  endTime: number;
}

export interface SignedBatch {
  batch: EventBatch;
  hash: string;
  prevHash: string;
}

export interface ChallengeResponse {
  attemptId: string;
  challengeToken: string;
  seed: number;
  rulesetId: string;
  ttl: number;
  ingestUrl: string;
}

export type AttemptResult = 'pending' | 'pass' | 'fail' | 'regenerate';

export interface AttemptResultResponse {
  attemptId: string;
  result: AttemptResult;
  score?: number;
  reason?: string;
}

export interface PlayProofConfig {
  apiUrl: string;
  gameDuration?: number;        // ms, default 3000
  batchInterval?: number;       // ms, default 500
  bufferDuration?: number;      // seconds to keep in ring buffer, default 5
  onEventBatch?: (batch: SignedBatch) => void;
  onAttemptEnd?: (result: AttemptResultResponse) => void;
  onRegenerate?: (reason: string) => void;
}

export interface GameConfig {
  width: number;
  height: number;
  backgroundColor?: number;
  seed: number;
  rulesetId: string;
}

export interface PlayProofGameElementAttributes {
  'api-url': string;
  'game-duration'?: string;
  'theme-primary'?: string;
  'theme-secondary'?: string;
  'theme-background'?: string;
}
