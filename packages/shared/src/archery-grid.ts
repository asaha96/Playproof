/**
 * Archery GridLevel adapter + validation
 * 
 * The grid is a 20x14 side-view representation:
 * - LLM generates a 2D grid where Y is vertical (0 = top, 13 = bottom)
 * - The compile function converts tile positions to 3D world coordinates
 * 
 * Tokens:
 * - '.' = empty space
 * - 'B' = bow position (archer)
 * - 'T' = target position (center)
 * - '#' = obstacle/tree (blocks arrows)
 */

import type {
  GridLevel,
  GridLevelValidationReport,
  GridLevelIssue,
  GridLevelLintReport,
  GridLevelSimulationReport
} from './gridlevel.js';

// Runtime spec expected by the archery game
export interface ArcheryLevelSpec {
  version: number;
  world: { width: number; height: number; depth: number };
  bow: { x: number; y: number; z: number };
  target: {
    x: number;
    y: number;
    z: number;
    outerRadius: number;
    bullseyeRadius: number;
    rings: number;
  };
  arrow: { speed: number; length: number };
  gravity: number;
  passThreshold: number;
  obstacles?: { x: number; y: number; z: number; w: number; h: number; d: number }[];
}

export const ARCHERY_TILE_SIZE = 1.0; // 1 unit per tile (3D world units)
export const ARCHERY_GRID_COLS = 20;
export const ARCHERY_GRID_ROWS = 14;

// World dimensions (in 3D units)
export const ARCHERY_WORLD_WIDTH = ARCHERY_GRID_COLS * ARCHERY_TILE_SIZE; // 20 units
export const ARCHERY_WORLD_HEIGHT = ARCHERY_GRID_ROWS * ARCHERY_TILE_SIZE; // 14 units

// Valid tokens for archery grid
const VALID_TOKENS = new Set(['.', 'B', 'T', '#']);

// Zone definitions (in tile coordinates)
// Bow zone: left side (cols 1-4, rows 4-10)
const BOW_ZONE = { minX: 1, maxX: 4, minY: 4, maxY: 10 };
// Target zone: right side (cols 15-18, rows 3-11)
const TARGET_ZONE = { minX: 15, maxX: 18, minY: 3, maxY: 11 };
// Obstacle band: middle zone (cols 5-14)
const OBSTACLE_ZONE = { minX: 5, maxX: 14, minY: 1, maxY: 12 };

interface TileCell {
  tx: number;
  ty: number;
  token: string;
}

interface RectSpec {
  x: number;
  y: number;
  w: number;
  h: number;
}

const chebyshev = (a: TileCell, b: TileCell): number =>
  Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));

const manhattan = (a: TileCell, b: TileCell): number =>
  Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);

/**
 * Validate an archery GridLevel
 */
export function validateArcheryGridLevel(level: GridLevel): GridLevelValidationReport {
  const errors: GridLevelIssue[] = [];
  const warnings: GridLevelIssue[] = [];

  // Defensive: ensure level object exists
  if (!level || typeof level !== 'object') {
    errors.push({
      stage: 'structural',
      message: 'Level object is missing or invalid',
      code: 'level.missing',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  // Defensive: ensure entities is an array
  if (!Array.isArray(level.entities)) {
    (level as any).entities = [];
    warnings.push({
      stage: 'structural',
      message: 'Entities array was missing, defaulting to empty',
      code: 'entities.missing',
      severity: 'warning'
    });
  }

  // Schema check
  if (level.schema !== 'playproof.gridlevel.v1') {
    errors.push({
      stage: 'structural',
      message: 'Unsupported schema',
      code: 'schema.invalid',
      severity: 'error'
    });
  }

  // Game ID check
  if (level.gameId !== 'archery') {
    errors.push({
      stage: 'structural',
      message: 'gameId must be archery',
      code: 'gameId.invalid',
      severity: 'error'
    });
  }

  // Grid dimensions check
  if (!level.grid || level.grid.cols !== ARCHERY_GRID_COLS || level.grid.rows !== ARCHERY_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: `Grid dimensions must be ${ARCHERY_GRID_COLS}x${ARCHERY_GRID_ROWS}`,
      code: 'grid.dimensions',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  if (level.grid.tiles.length !== ARCHERY_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: `Grid must have ${ARCHERY_GRID_ROWS} rows`,
      code: 'grid.rows',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  // Parse tiles
  const tiles: TileCell[] = [];
  const bowTiles: TileCell[] = [];
  const targetTiles: TileCell[] = [];
  const obstacleTiles: TileCell[] = [];

  for (let ty = 0; ty < ARCHERY_GRID_ROWS; ty += 1) {
    const row = level.grid.tiles[ty];
    if (!row || row.length !== ARCHERY_GRID_COLS) {
      errors.push({
        stage: 'structural',
        message: `Row ${ty} must have ${ARCHERY_GRID_COLS} columns`,
        code: 'grid.row.length',
        severity: 'error',
        data: { row: ty }
      });
      continue;
    }

    for (let tx = 0; tx < ARCHERY_GRID_COLS; tx += 1) {
      const token = row[tx];
      if (!VALID_TOKENS.has(token)) {
        errors.push({
          stage: 'structural',
          message: `Invalid token '${token}' at ${tx},${ty}`,
          code: 'grid.token',
          severity: 'error',
          data: { tx, ty, token }
        });
      }

      const cell: TileCell = { tx, ty, token };
      tiles.push(cell);

      if (token === 'B') bowTiles.push(cell);
      if (token === 'T') targetTiles.push(cell);
      if (token === '#') obstacleTiles.push(cell);
    }
  }

  // Exactly one bow position required
  if (bowTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: `Exactly one bow position (B) required, found ${bowTiles.length}`,
      code: 'bow.count',
      severity: 'error'
    });
  }

  // Exactly one target required
  if (targetTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: `Exactly one target (T) required, found ${targetTiles.length}`,
      code: 'target.count',
      severity: 'error'
    });
  }

  const bow = bowTiles[0];
  const target = targetTiles[0];

  // Bow zone validation
  if (bow) {
    if (bow.tx < BOW_ZONE.minX || bow.tx > BOW_ZONE.maxX ||
        bow.ty < BOW_ZONE.minY || bow.ty > BOW_ZONE.maxY) {
      errors.push({
        stage: 'placement',
        message: `Bow must be in cols ${BOW_ZONE.minX}-${BOW_ZONE.maxX}, rows ${BOW_ZONE.minY}-${BOW_ZONE.maxY}`,
        code: 'bow.zone',
        severity: 'error',
        data: { tx: bow.tx, ty: bow.ty }
      });
    }

    // Bow clearance: 3x3 "draw pocket" area around bow must be empty
    for (const cell of tiles) {
      if (chebyshev(bow, cell) <= 1 && !['.', 'B'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Bow draw pocket must be clear (3x3 around bow)',
          code: 'bow.clearance',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty, token: cell.token }
        });
      }
    }
  }

  // Target zone validation
  if (target) {
    if (target.tx < TARGET_ZONE.minX || target.tx > TARGET_ZONE.maxX ||
        target.ty < TARGET_ZONE.minY || target.ty > TARGET_ZONE.maxY) {
      errors.push({
        stage: 'placement',
        message: `Target must be in cols ${TARGET_ZONE.minX}-${TARGET_ZONE.maxX}, rows ${TARGET_ZONE.minY}-${TARGET_ZONE.maxY}`,
        code: 'target.zone',
        severity: 'error',
        data: { tx: target.tx, ty: target.ty }
      });
    }

    // Target clearance: 3x3 area around target must be empty (for rings)
    for (const cell of tiles) {
      if (chebyshev(target, cell) <= 1 && !['.', 'T'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Target area must be clear (3x3 around target)',
          code: 'target.clearance',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty, token: cell.token }
        });
      }
    }
  }

  // Separation check
  if (bow && target) {
    if (manhattan(bow, target) < 10) {
      errors.push({
        stage: 'placement',
        message: 'Bow and target too close (manhattan distance < 10)',
        code: 'separation.short',
        severity: 'error'
      });
    }
  }

  // Obstacle zone validation
  for (const obstacle of obstacleTiles) {
    if (obstacle.tx < OBSTACLE_ZONE.minX || obstacle.tx > OBSTACLE_ZONE.maxX ||
        obstacle.ty < OBSTACLE_ZONE.minY || obstacle.ty > OBSTACLE_ZONE.maxY) {
      errors.push({
        stage: 'placement',
        message: `Obstacles must be in middle zone (cols ${OBSTACLE_ZONE.minX}-${OBSTACLE_ZONE.maxX})`,
        code: 'obstacle.zone',
        severity: 'error',
        data: { tx: obstacle.tx, ty: obstacle.ty }
      });
    }
  }

  // Obstacle count check (warn if too many)
  if (obstacleTiles.length > 15) {
    warnings.push({
      stage: 'lint',
      message: `Too many obstacles (${obstacleTiles.length}), may block all shots`,
      code: 'obstacle.count',
      severity: 'warning'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Lint an archery GridLevel for style/quality issues
 */
export function lintArcheryGridLevel(level: GridLevel): GridLevelLintReport {
  const issues: GridLevelIssue[] = [];

  if (!level.design?.intent) {
    issues.push({
      stage: 'lint',
      message: 'Design intent missing',
      code: 'design.intent',
      severity: 'warning'
    });
  }

  // Count non-empty tiles for density check
  const nonEmptyCount = level.grid.tiles.join('').split('').filter(t => t !== '.').length;
  if (nonEmptyCount > 25) {
    issues.push({
      stage: 'lint',
      message: 'Too many non-empty tiles (cluttered level)',
      code: 'lint.density',
      severity: 'warning',
      data: { count: nonEmptyCount }
    });
  }

  return {
    strict: level.rules?.difficulty === 'medium',
    issues
  };
}

/**
 * Simulate solvability of archery level
 * Uses projectile physics to check if an arrow can reach the target
 */
export function simulateArcheryGridLevel(level: GridLevel): GridLevelSimulationReport {
  const tiles: TileCell[] = [];
  let bow: TileCell | null = null;
  let target: TileCell | null = null;

  // Parse grid
  for (let ty = 0; ty < level.grid.rows; ty++) {
    for (let tx = 0; tx < level.grid.cols; tx++) {
      const token = level.grid.tiles[ty][tx];
      const cell: TileCell = { tx, ty, token };
      tiles.push(cell);
      if (token === 'B') bow = cell;
      if (token === 'T') target = cell;
    }
  }

  if (!bow || !target) {
    return { passed: false, attempts: 0, note: 'Missing bow or target' };
  }

  // Convert to world coordinates (center of tile)
  // Note: Y axis is inverted (grid row 0 = top, world Y high)
  const bowX = (bow.tx + 0.5) * ARCHERY_TILE_SIZE;
  const bowY = (ARCHERY_GRID_ROWS - bow.ty - 0.5) * ARCHERY_TILE_SIZE;
  const targetX = (target.tx + 0.5) * ARCHERY_TILE_SIZE;
  const targetY = (ARCHERY_GRID_ROWS - target.ty - 0.5) * ARCHERY_TILE_SIZE;

  // Collect obstacle rectangles
  const obstacles: RectSpec[] = tiles
    .filter(t => t.token === '#')
    .map(t => ({
      x: t.tx * ARCHERY_TILE_SIZE,
      y: (ARCHERY_GRID_ROWS - t.ty - 1) * ARCHERY_TILE_SIZE,
      w: ARCHERY_TILE_SIZE,
      h: ARCHERY_TILE_SIZE
    }));

  // Gravity constant (same as game)
  const gravity = -9.8;
  const dt = 0.016; // 60 FPS time step
  const maxTime = 3.0; // Max flight time

  // Sample angles and powers
  const angles = [-10, -5, 0, 5, 10, 15, 20, 25, 30].map(a => (a * Math.PI) / 180);
  const speeds = [15, 18, 20, 22, 25];

  let attempts = 0;

  for (const angle of angles) {
    for (const speed of speeds) {
      attempts++;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      let x = bowX;
      let y = bowY;
      let velY = vy;
      let t = 0;

      while (t < maxTime) {
        // Update position
        x += vx * dt;
        velY += gravity * dt;
        y += velY * dt;

        // Check if out of bounds (ground or off-screen)
        if (y < 0 || x < 0 || x > ARCHERY_WORLD_WIDTH) {
          break;
        }

        // Check collision with obstacles
        let hitObstacle = false;
        for (const obs of obstacles) {
          if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
            hitObstacle = true;
            break;
          }
        }
        if (hitObstacle) break;

        // Check if arrow is near target (within tolerance)
        const distToTarget = Math.sqrt((x - targetX) ** 2 + (y - targetY) ** 2);
        if (distToTarget < 1.8) {
          return {
            passed: true,
            attempts,
            note: `Solvable with angle=${Math.round(angle * 180 / Math.PI)}deg, speed=${speed}`
          };
        }

        t += dt;
      }
    }
  }

  return {
    passed: false,
    attempts,
    note: 'No valid trajectory found in simulation'
  };
}

/**
 * Compile an archery GridLevel to runtime ArcheryLevelSpec
 */
export function compileArcheryGridLevel(level: GridLevel): ArcheryLevelSpec {
  // Default positions (matching current game)
  let bowX = -6;
  let bowY = 1.5;
  let targetX = 6;
  let targetY = 2;
  const obstacles: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];

  // Parse grid and extract positions
  // Convert grid coordinates to 3D world coordinates
  // Grid: 0,0 = top-left; World: x increases right, y increases up
  for (let ty = 0; ty < level.grid.rows; ty++) {
    for (let tx = 0; tx < level.grid.cols; tx++) {
      const token = level.grid.tiles[ty][tx];
      
      // Convert: grid x -> world x (centered around 0), grid y -> world y (inverted)
      const worldX = (tx - ARCHERY_GRID_COLS / 2 + 0.5) * ARCHERY_TILE_SIZE;
      const worldY = (ARCHERY_GRID_ROWS / 2 - ty - 0.5) * ARCHERY_TILE_SIZE;

      if (token === 'B') {
        bowX = worldX;
        bowY = worldY;
      } else if (token === 'T') {
        targetX = worldX;
        targetY = worldY;
      } else if (token === '#') {
        obstacles.push({
          x: worldX,
          y: worldY,
          z: 0,
          w: ARCHERY_TILE_SIZE,
          h: ARCHERY_TILE_SIZE * 2, // Obstacles are tall (like trees)
          d: ARCHERY_TILE_SIZE
        });
      }
    }
  }

  return {
    version: 1,
    world: {
      width: ARCHERY_WORLD_WIDTH,
      height: ARCHERY_WORLD_HEIGHT,
      depth: 10
    },
    bow: {
      x: bowX,
      y: bowY,
      z: 0
    },
    target: {
      x: targetX,
      y: targetY,
      z: 0,
      outerRadius: 1.5,
      bullseyeRadius: 0.3,
      rings: 5
    },
    arrow: {
      speed: 25,
      length: 1.2
    },
    gravity: -9.8,
    passThreshold: 30, // Score needed to pass
    obstacles: obstacles.length > 0 ? obstacles : undefined
  };
}

/**
 * Get golden/fallback archery levels
 */
export function getGoldenArcheryLevels(): GridLevel[] {
  return [
    // Easy level - straight shot, no obstacles
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'archery',
      version: 1,
      grid: {
        cols: ARCHERY_GRID_COLS,
        rows: ARCHERY_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '..B..............T..',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'easy', parShots: 3, maxShots: 5 },
      design: {
        intent: 'Simple straight shot to the target',
        playerHint: 'Aim directly at the target with medium power',
        solutionSketch: ['Direct shot with slight arc'],
        aestheticNotes: 'Open field with clear line of sight'
      }
    },
    // Medium level - one obstacle
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'archery',
      version: 1,
      grid: {
        cols: ARCHERY_GRID_COLS,
        rows: ARCHERY_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '....................',
          '....................',
          '................T...',
          '.........#..........',
          '..B......#..........',
          '.........#..........',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'medium', parShots: 3, maxShots: 5 },
      design: {
        intent: 'Arc shot over a tree obstacle',
        playerHint: 'Arc the arrow over the tree',
        solutionSketch: ['Lob shot over the vertical obstacle'],
        aestheticNotes: 'Single tree creates need for arc shot'
      }
    },
    // Hard level - multiple obstacles requiring precise arc
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'archery',
      version: 1,
      grid: {
        cols: ARCHERY_GRID_COLS,
        rows: ARCHERY_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '....................',
          '....................',
          '...............T....',
          '......#...#.........',
          '..B...#...#.........',
          '......#...#.........',
          '....................',
          '.........#..........',
          '.........#..........',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'hard', parShots: 3, maxShots: 5 },
      design: {
        intent: 'Navigate through forest of obstacles',
        playerHint: 'Find the gap between the trees',
        solutionSketch: ['Arc between the two tree lines, avoid the third'],
        aestheticNotes: 'Dense forest requires precise aim'
      }
    }
  ];
}
