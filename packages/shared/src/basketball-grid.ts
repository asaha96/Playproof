/**
 * Basketball GridLevel adapter + validation
 * 
 * The grid is a 20x14 side-view representation:
 * - LLM generates a 2D grid where Y is vertical (0 = top, 13 = bottom)
 * - The compile function converts tile positions to world coordinates
 * 
 * Tokens:
 * - '.' = empty space
 * - 'B' = ball spawn position
 * - 'H' = hoop position (center of rim)
 * - '#' = obstacle/wall
 */

import type {
  GridLevel,
  GridLevelValidationReport,
  GridLevelIssue,
  GridLevelLintReport,
  GridLevelSimulationReport
} from './gridlevel.js';

// Runtime spec expected by the basketball game
export interface BasketballLevelSpec {
  version: number;
  world: { width: number; height: number; gravity: number };
  ball: { x: number; y: number; radius: number };
  hoop: {
    x: number;
    y: number;
    rimWidth: number;
    rimThickness: number;
    backboardHeight: number;
    backboardWidth: number;
  };
  shootZone: { x: number; y: number; w: number; h: number };
  obstacles?: { x: number; y: number; w: number; h: number }[];
}

export const BASKETBALL_TILE_SIZE_PX = 20;
export const BASKETBALL_GRID_COLS = 20;
export const BASKETBALL_GRID_ROWS = 14;

// World dimensions in pixels
export const BASKETBALL_WORLD_WIDTH = BASKETBALL_GRID_COLS * BASKETBALL_TILE_SIZE_PX; // 400
export const BASKETBALL_WORLD_HEIGHT = BASKETBALL_GRID_ROWS * BASKETBALL_TILE_SIZE_PX; // 280

// Valid tokens for basketball grid
const VALID_TOKENS = new Set(['.', 'B', 'H', '#']);

// Zone definitions (in tile coordinates)
// Ball spawn zone: bottom-left area (cols 1-5, rows 8-12)
const BALL_ZONE = { minX: 1, maxX: 5, minY: 8, maxY: 12 };
// Hoop zone: top-right area (cols 14-18, rows 2-6)
const HOOP_ZONE = { minX: 14, maxX: 18, minY: 2, maxY: 6 };
// Obstacle band: middle zone (cols 6-13)
const OBSTACLE_ZONE = { minX: 6, maxX: 13, minY: 1, maxY: 12 };

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

const key = (tx: number, ty: number): string => `${tx},${ty}`;

const chebyshev = (a: TileCell, b: TileCell): number =>
  Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));

const manhattan = (a: TileCell, b: TileCell): number =>
  Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);

const inBounds = (tx: number, ty: number): boolean =>
  tx >= 0 && ty >= 0 && tx < BASKETBALL_GRID_COLS && ty < BASKETBALL_GRID_ROWS;

/**
 * Validate a basketball GridLevel
 */
export function validateBasketballGridLevel(level: GridLevel): GridLevelValidationReport {
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
  if (level.gameId !== 'basketball') {
    errors.push({
      stage: 'structural',
      message: 'gameId must be basketball',
      code: 'gameId.invalid',
      severity: 'error'
    });
  }

  // Grid dimensions check
  if (!level.grid || level.grid.cols !== BASKETBALL_GRID_COLS || level.grid.rows !== BASKETBALL_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: `Grid dimensions must be ${BASKETBALL_GRID_COLS}x${BASKETBALL_GRID_ROWS}`,
      code: 'grid.dimensions',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  if (level.grid.tiles.length !== BASKETBALL_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: `Grid must have ${BASKETBALL_GRID_ROWS} rows`,
      code: 'grid.rows',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  // Parse tiles
  const tiles: TileCell[] = [];
  const ballTiles: TileCell[] = [];
  const hoopTiles: TileCell[] = [];
  const obstacleTiles: TileCell[] = [];

  for (let ty = 0; ty < BASKETBALL_GRID_ROWS; ty += 1) {
    const row = level.grid.tiles[ty];
    if (!row || row.length !== BASKETBALL_GRID_COLS) {
      errors.push({
        stage: 'structural',
        message: `Row ${ty} must have ${BASKETBALL_GRID_COLS} columns`,
        code: 'grid.row.length',
        severity: 'error',
        data: { row: ty }
      });
      continue;
    }

    for (let tx = 0; tx < BASKETBALL_GRID_COLS; tx += 1) {
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

      if (token === 'B') ballTiles.push(cell);
      if (token === 'H') hoopTiles.push(cell);
      if (token === '#') obstacleTiles.push(cell);
    }
  }

  // Exactly one ball spawn required
  if (ballTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: `Exactly one ball spawn (B) required, found ${ballTiles.length}`,
      code: 'ball.count',
      severity: 'error'
    });
  }

  // Exactly one hoop required
  if (hoopTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: `Exactly one hoop (H) required, found ${hoopTiles.length}`,
      code: 'hoop.count',
      severity: 'error'
    });
  }

  const ball = ballTiles[0];
  const hoop = hoopTiles[0];

  // Ball zone validation
  if (ball) {
    if (ball.tx < BALL_ZONE.minX || ball.tx > BALL_ZONE.maxX ||
        ball.ty < BALL_ZONE.minY || ball.ty > BALL_ZONE.maxY) {
      errors.push({
        stage: 'placement',
        message: `Ball spawn must be in cols ${BALL_ZONE.minX}-${BALL_ZONE.maxX}, rows ${BALL_ZONE.minY}-${BALL_ZONE.maxY}`,
        code: 'ball.zone',
        severity: 'error',
        data: { tx: ball.tx, ty: ball.ty }
      });
    }

    // Ball clearance: 5x5 area around ball must be empty
    for (const cell of tiles) {
      if (chebyshev(ball, cell) <= 2 && !['.', 'B'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Ball spawn area must be clear (5x5 around ball)',
          code: 'ball.clearance',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty, token: cell.token }
        });
      }
    }
  }

  // Hoop zone validation
  if (hoop) {
    if (hoop.tx < HOOP_ZONE.minX || hoop.tx > HOOP_ZONE.maxX ||
        hoop.ty < HOOP_ZONE.minY || hoop.ty > HOOP_ZONE.maxY) {
      errors.push({
        stage: 'placement',
        message: `Hoop must be in cols ${HOOP_ZONE.minX}-${HOOP_ZONE.maxX}, rows ${HOOP_ZONE.minY}-${HOOP_ZONE.maxY}`,
        code: 'hoop.zone',
        severity: 'error',
        data: { tx: hoop.tx, ty: hoop.ty }
      });
    }

    // Hoop clearance: 3x3 area around hoop must be empty
    for (const cell of tiles) {
      if (chebyshev(hoop, cell) <= 1 && !['.', 'H'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Hoop area must be clear (3x3 around hoop)',
          code: 'hoop.clearance',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty, token: cell.token }
        });
      }
    }
  }

  // Separation check
  if (ball && hoop) {
    if (manhattan(ball, hoop) < 10) {
      errors.push({
        stage: 'placement',
        message: 'Ball and hoop too close (manhattan distance < 10)',
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
  if (obstacleTiles.length > 20) {
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
 * Lint a basketball GridLevel for style/quality issues
 */
export function lintBasketballGridLevel(level: GridLevel): GridLevelLintReport {
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
  if (nonEmptyCount > 30) {
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
 * Simulate solvability of basketball level
 * Uses ballistic trajectory sampling to check if a shot can reach the hoop
 */
export function simulateBasketballGridLevel(level: GridLevel): GridLevelSimulationReport {
  const tiles: TileCell[] = [];
  let ball: TileCell | null = null;
  let hoop: TileCell | null = null;

  // Parse grid
  for (let ty = 0; ty < level.grid.rows; ty++) {
    for (let tx = 0; tx < level.grid.cols; tx++) {
      const token = level.grid.tiles[ty][tx];
      const cell: TileCell = { tx, ty, token };
      tiles.push(cell);
      if (token === 'B') ball = cell;
      if (token === 'H') hoop = cell;
    }
  }

  if (!ball || !hoop) {
    return { passed: false, attempts: 0, note: 'Missing ball or hoop' };
  }

  // Convert to world coordinates (center of tile)
  const ballX = (ball.tx + 0.5) * BASKETBALL_TILE_SIZE_PX;
  const ballY = (ball.ty + 0.5) * BASKETBALL_TILE_SIZE_PX;
  const hoopX = (hoop.tx + 0.5) * BASKETBALL_TILE_SIZE_PX;
  const hoopY = (hoop.ty + 0.5) * BASKETBALL_TILE_SIZE_PX;

  // Collect obstacle rectangles
  const obstacles: RectSpec[] = tiles
    .filter(t => t.token === '#')
    .map(t => ({
      x: t.tx * BASKETBALL_TILE_SIZE_PX,
      y: t.ty * BASKETBALL_TILE_SIZE_PX,
      w: BASKETBALL_TILE_SIZE_PX,
      h: BASKETBALL_TILE_SIZE_PX
    }));

  // Gravity constant (same as game)
  const gravity = 600;
  const dt = 0.016; // 60 FPS time step
  const maxTime = 3.0; // Max flight time

  // Sample angles and powers
  const angles = [30, 35, 40, 45, 50, 55, 60, 65, 70].map(a => (a * Math.PI) / 180);
  const powers = [300, 350, 400, 450, 500, 550];

  let attempts = 0;

  for (const angle of angles) {
    for (const power of powers) {
      attempts++;

      const vx = Math.cos(angle) * power;
      const vy = -Math.sin(angle) * power; // Negative because Y increases downward

      let x = ballX;
      let y = ballY;
      let velY = vy;
      let t = 0;

      while (t < maxTime) {
        // Update position
        x += vx * dt;
        velY += gravity * dt;
        y += velY * dt;

        // Check if out of bounds
        if (x < 0 || x > BASKETBALL_WORLD_WIDTH || y > BASKETBALL_WORLD_HEIGHT) {
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

        // Check if ball is near hoop (within tolerance)
        const distToHoop = Math.sqrt((x - hoopX) ** 2 + (y - hoopY) ** 2);
        if (distToHoop < 25) {
          return {
            passed: true,
            attempts,
            note: `Solvable with angle=${Math.round(angle * 180 / Math.PI)}deg, power=${power}`
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
 * Compile a basketball GridLevel to runtime BasketballLevelSpec
 */
export function compileBasketballGridLevel(level: GridLevel): BasketballLevelSpec {
  let ballX = 80;
  let ballY = 220;
  let hoopX = 300;
  let hoopY = 100;
  const obstacles: RectSpec[] = [];

  // Parse grid and extract positions
  for (let ty = 0; ty < level.grid.rows; ty++) {
    for (let tx = 0; tx < level.grid.cols; tx++) {
      const token = level.grid.tiles[ty][tx];
      const cx = (tx + 0.5) * BASKETBALL_TILE_SIZE_PX;
      const cy = (ty + 0.5) * BASKETBALL_TILE_SIZE_PX;

      if (token === 'B') {
        ballX = cx;
        ballY = cy;
      } else if (token === 'H') {
        hoopX = cx;
        hoopY = cy;
      } else if (token === '#') {
        obstacles.push({
          x: tx * BASKETBALL_TILE_SIZE_PX,
          y: ty * BASKETBALL_TILE_SIZE_PX,
          w: BASKETBALL_TILE_SIZE_PX,
          h: BASKETBALL_TILE_SIZE_PX
        });
      }
    }
  }

  // Compute shoot zone based on ball position
  // Allow shooting from bottom-left quadrant around the ball
  const shootZone: RectSpec = {
    x: Math.max(0, ballX - 60),
    y: Math.max(ballY - 40, BASKETBALL_WORLD_HEIGHT * 0.5),
    w: 120,
    h: BASKETBALL_WORLD_HEIGHT * 0.5
  };

  return {
    version: 1,
    world: {
      width: BASKETBALL_WORLD_WIDTH,
      height: BASKETBALL_WORLD_HEIGHT,
      gravity: 600
    },
    ball: {
      x: ballX,
      y: ballY,
      radius: 15
    },
    hoop: {
      x: hoopX,
      y: hoopY,
      rimWidth: 50,
      rimThickness: 4,
      backboardHeight: 60,
      backboardWidth: 8
    },
    shootZone,
    obstacles: obstacles.length > 0 ? obstacles : undefined
  };
}

/**
 * Get golden/fallback basketball levels
 */
export function getGoldenBasketballLevels(): GridLevel[] {
  return [
    // Easy level - straight shot, no obstacles
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'basketball',
      version: 1,
      grid: {
        cols: BASKETBALL_GRID_COLS,
        rows: BASKETBALL_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '....................',
          '...............H....',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '....................',
          '..B.................',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'easy', parShots: 1, maxShots: 3 },
      design: {
        intent: 'Simple straight shot to the hoop',
        playerHint: 'Aim high and release with medium power',
        solutionSketch: ['Arc shot from bottom-left to top-right'],
        aestheticNotes: 'Clean court with clear sightline'
      }
    },
    // Medium level - one obstacle
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'basketball',
      version: 1,
      grid: {
        cols: BASKETBALL_GRID_COLS,
        rows: BASKETBALL_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '....................',
          '................H...',
          '....................',
          '........##..........',
          '........##..........',
          '....................',
          '....................',
          '....................',
          '...B................',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'medium', parShots: 1, maxShots: 3 },
      design: {
        intent: 'Arc shot over a mid-court obstacle',
        playerHint: 'Use a higher arc to clear the obstacle',
        solutionSketch: ['High arc over the 2x2 wall block'],
        aestheticNotes: 'Single obstacle creates challenge'
      }
    },
    // Hard level - multiple obstacles requiring precise arc
    {
      schema: 'playproof.gridlevel.v1',
      gameId: 'basketball',
      version: 1,
      grid: {
        cols: BASKETBALL_GRID_COLS,
        rows: BASKETBALL_GRID_ROWS,
        tiles: [
          '....................',
          '....................',
          '...............H....',
          '....................',
          '..........#.........',
          '........###.........',
          '..........#.........',
          '....................',
          '......#.............',
          '......#.............',
          '..B.................',
          '....................',
          '....................',
          '....................'
        ]
      },
      entities: [],
      rules: { difficulty: 'hard', parShots: 1, maxShots: 3 },
      design: {
        intent: 'Challenging arc through obstacle gauntlet',
        playerHint: 'Find the gap between obstacles with precise angle',
        solutionSketch: ['Thread between left pillar and cross-shaped obstacle'],
        aestheticNotes: 'Multiple obstacles create narrow shooting window'
      }
    }
  ];
}
