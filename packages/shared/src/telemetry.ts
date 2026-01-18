/**
 * Telemetry event table types
 */

export type TelemetryPointerType = 'mouse' | 'touch' | 'pen' | 'unknown';

export type TelemetryEvent =
  | 'attempt_start'
  | 'attempt_end'
  | 'pointer_move'
  | 'pointer_down'
  | 'pointer_up'
  | 'drag_start'
  | 'drag_move'
  | 'drag_end'
  | 'shot_committed'
  | 'physics_tick'
  | 'moving_block_tick'
  | 'collision_wall'
  | 'collision_moving_block'
  | 'portal_enter'
  | 'portal_exit'
  | 'hazard_enter_water'
  | 'respawn'
  | 'ball_stopped';

export interface TelemetryRow {
  seq: number;
  t: number;
  tsWall?: number;
  gameId: string;
  levelId?: string;
  seed?: number | string;
  rulesetVersion?: number;
  event: TelemetryEvent;
  frame: number;
  dt?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  meta?: Record<string, unknown>;
}

export interface TelemetryBatch {
  attemptId: string;
  gameId: string;
  seqStart: number;
  seqEnd: number;
  rows: TelemetryRow[];
}

export interface TelemetryConfig {
  batchIntervalMs: number;
  batchSize: number;
}
