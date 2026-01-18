/**
 * GridLevel authoring schema (cross-game)
 */

export const GRIDLEVEL_SCHEMA_V1 = 'playproof.gridlevel.v1' as const;
export type GridLevelSchema = typeof GRIDLEVEL_SCHEMA_V1;

export type GridLevelDifficulty = 'easy' | 'medium' | 'hard';

export interface GridCoord {
  tx: number;
  ty: number;
}

export interface GridLevelGrid {
  cols: number;
  rows: number;
  tiles: string[];
}

export interface GridLevelDesign {
  intent: string;
  playerHint: string;
  solutionSketch: string[];
  aestheticNotes: string;
}

export interface GridLevelRules {
  difficulty?: GridLevelDifficulty;
  [key: string]: unknown;
}

export interface PortalEntity {
  type: 'portal';
  id: string;
  entrance: GridCoord;
  exit: GridCoord;
  cooldownMs?: number;
  exitVelocityMultiplier?: number;
}

export interface MovingBlockMotion {
  axis: 'x' | 'y';
  rangeTiles: number;
  speedTilesPerSec: number;
  mode: 'pingpong' | 'loop';
  phase?: number;
}

export interface MovingBlockEntity {
  type: 'movingBlock';
  id: string;
  motion: MovingBlockMotion;
}

export type GridLevelEntity = PortalEntity | MovingBlockEntity;

export interface GridLevel {
  schema: GridLevelSchema;
  gameId: string;
  version: number;
  seed?: number | string;
  grid: GridLevelGrid;
  entities: GridLevelEntity[];
  rules?: GridLevelRules;
  design: GridLevelDesign;
}

export type GridLevelValidationStage = 'structural' | 'placement' | 'shapes' | 'swept-motion';
export type GridLevelIssueSeverity = 'error' | 'warning';

export interface GridLevelIssue {
  stage: GridLevelValidationStage | 'lint' | 'simulation';
  message: string;
  code: string;
  severity: GridLevelIssueSeverity;
  data?: Record<string, unknown>;
}

export interface GridLevelValidationReport {
  valid: boolean;
  errors: GridLevelIssue[];
  warnings: GridLevelIssue[];
}

export interface GridLevelLintReport {
  strict: boolean;
  issues: GridLevelIssue[];
}

export interface GridLevelSimulationReport {
  passed: boolean;
  attempts: number;
  note?: string;
  bestShot?: {
    angleRad: number;
    power: number;
    steps: number;
    distanceToHole: number;
    holed: boolean;
  };
}

export interface PcgLevelRequest {
  gameId: string;
  difficulty?: GridLevelDifficulty;
  seed?: number | string;
  rulesOverrides?: Record<string, unknown>;
}

export interface PcgLevelResponse {
  gridLevel: GridLevel;
  validationReport: GridLevelValidationReport;
  lintReport: GridLevelLintReport;
  simulationReport?: GridLevelSimulationReport;
  rulesetVersion: number;
  signature?: string;
}
