/**
 * Mini-golf GridLevel adapter + validation
 */

import type {
  GridLevel,
  GridLevelValidationReport,
  GridLevelIssue,
  GridLevelLintReport,
  GridLevelSimulationReport
} from './gridlevel.js';
import type { MiniGolfLevelSpec } from './types.js';

export const MINI_GOLF_TILE_SIZE_PX = 20;
export const MINI_GOLF_GRID_COLS = 20;
export const MINI_GOLF_GRID_ROWS = 14;

const WALL_SIZES = new Set(['1x1', '1x2', '1x3', '1x4', '2x2', '2x3', '3x2', '4x1']);
const MOVING_BLOCK_SIZES = new Set(['1x2', '1x3', '2x2']);

const WALL_TOKENS = ['#'];
const SAND_TOKENS = ['S'];
const WATER_TOKENS = ['~'];
const CURRENT_TOKENS = ['^', 'v', '<', '>'];

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

interface ComponentRect {
  rect: RectSpec;
  tiles: TileCell[];
}

const toIndex = (tx: number, ty: number): number => ty * MINI_GOLF_GRID_COLS + tx;

const inBounds = (tx: number, ty: number): boolean =>
  tx >= 0 && ty >= 0 && tx < MINI_GOLF_GRID_COLS && ty < MINI_GOLF_GRID_ROWS;

const chebyshev = (a: TileCell, b: TileCell): number => Math.max(Math.abs(a.tx - b.tx), Math.abs(a.ty - b.ty));

const manhattan = (a: TileCell, b: TileCell): number => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);

const key = (tx: number, ty: number): string => `${tx},${ty}`;

export function validateMiniGolfGridLevel(level: GridLevel): GridLevelValidationReport {
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

  // Defensive: ensure entities is an array (normalize if not)
  if (!Array.isArray(level.entities)) {
    // Don't fail - just normalize and add a warning
    (level as any).entities = [];
    warnings.push({
      stage: 'structural',
      message: 'Entities array was missing, defaulting to empty',
      code: 'entities.missing',
      severity: 'warning'
    });
  }

  if (level.schema !== 'playproof.gridlevel.v1') {
    errors.push({
      stage: 'structural',
      message: 'Unsupported schema',
      code: 'schema.invalid',
      severity: 'error'
    });
  }

  if (level.gameId !== 'mini-golf') {
    errors.push({
      stage: 'structural',
      message: 'gameId must be mini-golf',
      code: 'gameId.invalid',
      severity: 'error'
    });
  }

  if (!level.grid || level.grid.cols !== MINI_GOLF_GRID_COLS || level.grid.rows !== MINI_GOLF_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: 'Grid dimensions must be 20x14',
      code: 'grid.dimensions',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  if (level.grid.tiles.length !== MINI_GOLF_GRID_ROWS) {
    errors.push({
      stage: 'structural',
      message: 'Grid must have 14 rows',
      code: 'grid.rows',
      severity: 'error'
    });
    return { valid: false, errors, warnings };
  }

  const tiles: TileCell[] = [];
  const tokenSet = new Set(['.', 'B', 'H', '#', 'S', '~', '^', 'v', '<', '>', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  const ballTiles: TileCell[] = [];
  const holeTiles: TileCell[] = [];

  for (let ty = 0; ty < MINI_GOLF_GRID_ROWS; ty += 1) {
    const row = level.grid.tiles[ty];
    if (!row || row.length !== MINI_GOLF_GRID_COLS) {
      errors.push({
        stage: 'structural',
        message: `Row ${ty} must have ${MINI_GOLF_GRID_COLS} columns`,
        code: 'grid.row.length',
        severity: 'error',
        data: { row: ty }
      });
      continue;
    }
    for (let tx = 0; tx < MINI_GOLF_GRID_COLS; tx += 1) {
      const token = row[tx];
      if (!tokenSet.has(token)) {
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
      if (token === 'H') holeTiles.push(cell);
    }
  }

  if (ballTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: 'Exactly one ball spawn required',
      code: 'ball.count',
      severity: 'error'
    });
  }

  if (holeTiles.length !== 1) {
    errors.push({
      stage: 'structural',
      message: 'Exactly one hole required',
      code: 'hole.count',
      severity: 'error'
    });
  }

  const ball = ballTiles[0];
  const hole = holeTiles[0];

  if (ball) {
    if (ball.tx < 1 || ball.tx > 5 || ball.ty < 2 || ball.ty > 11) {
      errors.push({
        stage: 'placement',
        message: 'Ball spawn outside allowed region',
        code: 'ball.zone',
        severity: 'error',
        data: { tx: ball.tx, ty: ball.ty }
      });
    }
    for (const cell of tiles) {
      if (chebyshev(ball, cell) <= 2 && !['.', 'S', 'B'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Ball tee pocket must be clear',
          code: 'ball.pocket',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty }
        });
      }
    }
  }

  if (hole) {
    if (hole.tx < 14 || hole.tx > 18 || hole.ty < 2 || hole.ty > 11) {
      errors.push({
        stage: 'placement',
        message: 'Hole outside allowed region',
        code: 'hole.zone',
        severity: 'error',
        data: { tx: hole.tx, ty: hole.ty }
      });
    }
    for (const cell of tiles) {
      if (chebyshev(hole, cell) <= 1 && ['#', '~'].includes(cell.token)) {
        errors.push({
          stage: 'placement',
          message: 'Hole clearance violates wall/water restriction',
          code: 'hole.clearance',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty }
        });
      }
    }
  }

  if (ball && hole) {
    if (manhattan(ball, hole) < 12) {
      errors.push({
        stage: 'placement',
        message: 'Ball and hole too close',
        code: 'separation.short',
        severity: 'error'
      });
    }
    if (ball.ty === hole.ty && Math.abs(ball.tx - hole.tx) < 10) {
      errors.push({
        stage: 'placement',
        message: 'Ball and hole in same row with small gap',
        code: 'separation.row',
        severity: 'error'
      });
    }
  }

  for (const cell of tiles) {
    if (cell.token === '#') {
      if (cell.tx < 1 || cell.tx > 18 || cell.ty < 1 || cell.ty > 12) {
        errors.push({
          stage: 'placement',
          message: 'Wall tile outside allowed region',
          code: 'wall.zone',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty }
        });
      }
    }
  }

  if (ball) {
    for (const cell of tiles) {
      if (cell.token === '#' && chebyshev(ball, cell) <= 1) {
        errors.push({
          stage: 'placement',
          message: 'Walls cannot be adjacent to ball',
          code: 'wall.nearBall',
          severity: 'error',
          data: { tx: cell.tx, ty: cell.ty }
        });
      }
    }
  }

  const sandComponents = findComponents(tiles, SAND_TOKENS);
  for (const component of sandComponents) {
    if (component.tiles.length < 2) {
      errors.push({
        stage: 'placement',
        message: 'Sand must be at least 2 tiles',
        code: 'sand.size',
        severity: 'error'
      });
    }
  }

  const waterComponents = findComponents(tiles, WATER_TOKENS);
  for (const component of waterComponents) {
    if (component.tiles.length < 2) {
      errors.push({
        stage: 'placement',
        message: 'Water must be at least 2 tiles',
        code: 'water.size',
        severity: 'error'
      });
    }
    if (ball) {
      for (const cell of component.tiles) {
        if (chebyshev(ball, cell) <= 3) {
          errors.push({
            stage: 'placement',
            message: 'Water too close to ball spawn',
            code: 'water.nearBall',
            severity: 'error'
          });
          break;
        }
      }
    }
    for (const cell of component.tiles) {
      if (cell.tx < 2 || cell.tx > 17 || cell.ty < 2 || cell.ty > 11) {
        errors.push({
          stage: 'placement',
          message: 'Water outside allowed region',
          code: 'water.zone',
          severity: 'error'
        });
        break;
      }
    }
  }

  const currentRuns = findRuns(tiles, CURRENT_TOKENS);
  for (const run of currentRuns) {
    if (run.length < 3) {
      errors.push({
        stage: 'placement',
        message: 'Current runs must be length >= 3',
        code: 'current.length',
        severity: 'error'
      });
    }
    for (const cell of run) {
      if (cell.tx < 6 || cell.tx > 13 || cell.ty < 2 || cell.ty > 11) {
        errors.push({
          stage: 'placement',
          message: 'Current outside allowed band',
          code: 'current.zone',
          severity: 'error'
        });
        break;
      }
    }
  }

  const wallComponents = findComponents(tiles, WALL_TOKENS);
  for (const component of wallComponents) {
    const rect = component.rect;
    const sizeKey = `${rect.w}x${rect.h}`;
    if (!WALL_SIZES.has(sizeKey)) {
      errors.push({
        stage: 'shapes',
        message: 'Wall component must be allowed rectangle size',
        code: 'wall.size',
        severity: 'error',
        data: { size: sizeKey }
      });
    }
    if (component.tiles.length !== rect.w * rect.h) {
      errors.push({
        stage: 'shapes',
        message: 'Wall component must be filled rectangle',
        code: 'wall.rectangle',
        severity: 'error'
      });
    }
  }

  const movingBlockRegions = findMovingBlockRegions(tiles);
  const movingEntities = level.entities.filter(entity => entity.type === 'movingBlock');
  for (const [id, region] of movingBlockRegions.entries()) {
    const sizeKey = `${region.rect.w}x${region.rect.h}`;
    if (!MOVING_BLOCK_SIZES.has(sizeKey)) {
      warnings.push({
        stage: 'lint',
        message: 'Moving block region size is non-standard',
        code: 'movingBlock.size',
        severity: 'warning',
        data: { id, size: sizeKey }
      });
    }
    for (const tile of region.tiles) {
      if (tile.tx < 6 || tile.tx > 13 || tile.ty < 2 || tile.ty > 11) {
        errors.push({
          stage: 'placement',
          message: 'Moving block outside allowed band',
          code: 'movingBlock.zone',
          severity: 'error',
          data: { id }
        });
        break;
      }
    }
  }

  for (const entity of movingEntities) {
    if (!movingBlockRegions.has(entity.id)) {
      errors.push({
        stage: 'structural',
        message: 'Moving block entity has no matching region',
        code: 'movingBlock.region',
        severity: 'error',
        data: { id: entity.id }
      });
    }
  }

  for (const [id, region] of movingBlockRegions.entries()) {
    const entity = movingEntities.find(item => item.id === id);
    if (!entity) continue;
    const rangeTiles = entity.motion.rangeTiles;
    const rect = region.rect;
    const sweep = entity.motion.axis === 'x'
      ? { x: rect.x - rangeTiles, y: rect.y, w: rect.w + rangeTiles * 2, h: rect.h }
      : { x: rect.x, y: rect.y - rangeTiles, w: rect.w, h: rect.h + rangeTiles * 2 };
    if (sweep.x < 1 || sweep.y < 1 || sweep.x + sweep.w > MINI_GOLF_GRID_COLS - 1 || sweep.y + sweep.h > MINI_GOLF_GRID_ROWS - 1) {
      errors.push({
        stage: 'swept-motion',
        message: 'Moving block sweep outside bounds',
        code: 'movingBlock.sweep.bounds',
        severity: 'error',
        data: { id }
      });
    }
    if (ball && rectIntersects(sweep, { x: ball.tx - 2, y: ball.ty - 2, w: 5, h: 5 })) {
      errors.push({
        stage: 'swept-motion',
        message: 'Moving block sweep intersects tee pocket',
        code: 'movingBlock.sweep.tee',
        severity: 'error',
        data: { id }
      });
    }
    if (hole && rectIntersects(sweep, { x: hole.tx - 1, y: hole.ty - 1, w: 3, h: 3 })) {
      errors.push({
        stage: 'swept-motion',
        message: 'Moving block sweep intersects hole clearance',
        code: 'movingBlock.sweep.hole',
        severity: 'error',
        data: { id }
      });
    }
  }

  const portals = level.entities.filter(entity => entity.type === 'portal');
  for (const portal of portals) {
    if (portal.entrance.tx < 6 || portal.entrance.tx > 12) {
      errors.push({
        stage: 'placement',
        message: 'Portal entrance outside allowed band',
        code: 'portal.entrance.zone',
        severity: 'error',
        data: { id: portal.id }
      });
    }
    if (portal.exit.tx < 10 || portal.exit.tx > 17) {
      errors.push({
        stage: 'placement',
        message: 'Portal exit outside allowed band',
        code: 'portal.exit.zone',
        severity: 'error',
        data: { id: portal.id }
      });
    }
    if (ball && chebyshev(ball, { tx: portal.entrance.tx, ty: portal.entrance.ty, token: 'E' }) < 3) {
      errors.push({
        stage: 'placement',
        message: 'Portal entrance too close to ball',
        code: 'portal.entrance.nearBall',
        severity: 'error',
        data: { id: portal.id }
      });
    }
    if (hole && chebyshev(hole, { tx: portal.exit.tx, ty: portal.exit.ty, token: 'X' }) < 3) {
      errors.push({
        stage: 'placement',
        message: 'Portal exit too close to hole',
        code: 'portal.exit.nearHole',
        severity: 'error',
        data: { id: portal.id }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function lintMiniGolfGridLevel(level: GridLevel): GridLevelLintReport {
  const issues: GridLevelIssue[] = [];
  if (!level.design?.intent) {
    issues.push({
      stage: 'lint',
      message: 'Design intent missing',
      code: 'design.intent',
      severity: 'warning'
    });
  }

  const density = level.grid.tiles.join('').split('').filter(token => token !== '.').length;
  if (density > 120) {
    issues.push({
      stage: 'lint',
      message: 'Too many non-empty tiles',
      code: 'lint.density',
      severity: 'warning',
      data: { density }
    });
  }

  return {
    strict: level.rules?.difficulty === 'medium',
    issues
  };
}

export function simulateMiniGolfGridLevel(_level: GridLevel): GridLevelSimulationReport {
  return {
    passed: true,
    attempts: 0,
    note: 'Simulation not yet implemented'
  };
}

export function compileMiniGolfGridLevel(level: GridLevel): MiniGolfLevelSpec {
  const spec: MiniGolfLevelSpec = {
    version: 1,
    world: { width: MINI_GOLF_GRID_COLS * MINI_GOLF_TILE_SIZE_PX, height: MINI_GOLF_GRID_ROWS * MINI_GOLF_TILE_SIZE_PX, friction: 0.985 },
    ball: { x: 0, y: 0, radius: 10 },
    hole: { x: 0, y: 0, radius: 18 },
    walls: [],
    sand: [],
    water: [],
    currents: [],
    portals: [],
    movingBlocks: []
  };

  for (let ty = 0; ty < MINI_GOLF_GRID_ROWS; ty += 1) {
    const row = level.grid.tiles[ty];
    for (let tx = 0; tx < MINI_GOLF_GRID_COLS; tx += 1) {
      const token = row[tx];
      const cx = (tx + 0.5) * MINI_GOLF_TILE_SIZE_PX;
      const cy = (ty + 0.5) * MINI_GOLF_TILE_SIZE_PX;
      if (token === 'B') {
        spec.ball = { x: cx, y: cy, radius: 10 };
      }
      if (token === 'H') {
        spec.hole = { x: cx, y: cy, radius: 18 };
      }
    }
  }

  const wallComponents = findComponentsFromGrid(level.grid.tiles, WALL_TOKENS);
  for (const component of wallComponents) {
    spec.walls.push({
      x: component.rect.x * MINI_GOLF_TILE_SIZE_PX,
      y: component.rect.y * MINI_GOLF_TILE_SIZE_PX,
      w: component.rect.w * MINI_GOLF_TILE_SIZE_PX,
      h: component.rect.h * MINI_GOLF_TILE_SIZE_PX
    });
  }

  const sandComponents = findComponentsFromGrid(level.grid.tiles, SAND_TOKENS);
  for (const component of sandComponents) {
    spec.sand?.push({
      x: component.rect.x * MINI_GOLF_TILE_SIZE_PX,
      y: component.rect.y * MINI_GOLF_TILE_SIZE_PX,
      w: component.rect.w * MINI_GOLF_TILE_SIZE_PX,
      h: component.rect.h * MINI_GOLF_TILE_SIZE_PX
    });
  }

  const waterComponents = findComponentsFromGrid(level.grid.tiles, WATER_TOKENS);
  for (const component of waterComponents) {
    spec.water?.push({
      x: component.rect.x * MINI_GOLF_TILE_SIZE_PX,
      y: component.rect.y * MINI_GOLF_TILE_SIZE_PX,
      w: component.rect.w * MINI_GOLF_TILE_SIZE_PX,
      h: component.rect.h * MINI_GOLF_TILE_SIZE_PX
    });
  }

  const currents = extractCurrents(level.grid.tiles);
  spec.currents = currents.map(current => ({
    x: current.x * MINI_GOLF_TILE_SIZE_PX,
    y: current.y * MINI_GOLF_TILE_SIZE_PX,
    w: current.w * MINI_GOLF_TILE_SIZE_PX,
    h: current.h * MINI_GOLF_TILE_SIZE_PX,
    direction: current.direction
  }));

  spec.portals = level.entities
    .filter(entity => entity.type === 'portal')
    .map(entity => ({
      id: entity.id,
      entrance: { x: (entity.entrance.tx + 0.5) * MINI_GOLF_TILE_SIZE_PX, y: (entity.entrance.ty + 0.5) * MINI_GOLF_TILE_SIZE_PX },
      exit: { x: (entity.exit.tx + 0.5) * MINI_GOLF_TILE_SIZE_PX, y: (entity.exit.ty + 0.5) * MINI_GOLF_TILE_SIZE_PX },
      cooldownMs: entity.cooldownMs,
      exitVelocityMultiplier: entity.exitVelocityMultiplier
    }));

  const movingRegions = findMovingBlockRegionsFromGrid(level.grid.tiles);
  spec.movingBlocks = level.entities
    .filter(entity => entity.type === 'movingBlock')
    .map(entity => {
      const region = movingRegions.get(entity.id);
      if (!region) {
        return {
          id: entity.id,
          x: 0,
          y: 0,
          w: MINI_GOLF_TILE_SIZE_PX,
          h: MINI_GOLF_TILE_SIZE_PX,
          motion: {
            axis: entity.motion.axis,
            range: entity.motion.rangeTiles * MINI_GOLF_TILE_SIZE_PX,
            speed: entity.motion.speedTilesPerSec * MINI_GOLF_TILE_SIZE_PX,
            mode: entity.motion.mode,
            phase: entity.motion.phase
          }
        };
      }
      return {
        id: entity.id,
        x: region.rect.x * MINI_GOLF_TILE_SIZE_PX,
        y: region.rect.y * MINI_GOLF_TILE_SIZE_PX,
        w: region.rect.w * MINI_GOLF_TILE_SIZE_PX,
        h: region.rect.h * MINI_GOLF_TILE_SIZE_PX,
        motion: {
          axis: entity.motion.axis,
          range: entity.motion.rangeTiles * MINI_GOLF_TILE_SIZE_PX,
          speed: entity.motion.speedTilesPerSec * MINI_GOLF_TILE_SIZE_PX,
          mode: entity.motion.mode,
          phase: entity.motion.phase
        }
      };
    });

  return spec;
}

function rectIntersects(a: RectSpec, b: RectSpec): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findComponents(tiles: TileCell[], tokens: string[]): ComponentRect[] {
  const components: ComponentRect[] = [];
  const visited = new Set<string>();

  for (const tile of tiles) {
    if (!tokens.includes(tile.token)) continue;
    const id = key(tile.tx, tile.ty);
    if (visited.has(id)) continue;

    const stack = [tile];
    const component: TileCell[] = [];
    visited.add(id);

    while (stack.length) {
      const current = stack.pop();
      if (!current) break;
      component.push(current);
      const neighbors = [
        { tx: current.tx + 1, ty: current.ty },
        { tx: current.tx - 1, ty: current.ty },
        { tx: current.tx, ty: current.ty + 1 },
        { tx: current.tx, ty: current.ty - 1 }
      ];
      for (const neighbor of neighbors) {
        if (!inBounds(neighbor.tx, neighbor.ty)) continue;
        const neighborId = key(neighbor.tx, neighbor.ty);
        if (visited.has(neighborId)) continue;
        const neighborTile = tiles[toIndex(neighbor.tx, neighbor.ty)];
        if (!neighborTile || !tokens.includes(neighborTile.token)) continue;
        visited.add(neighborId);
        stack.push(neighborTile);
      }
    }

    const rect = componentToRect(component);
    components.push({ rect, tiles: component });
  }

  return components;
}

function findMovingBlockRegions(tiles: TileCell[]): Map<string, ComponentRect> {
  const regions = new Map<string, ComponentRect>();
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (const digit of digits) {
    const components = findComponents(tiles, [digit]);
    if (components.length === 1) {
      regions.set(digit, components[0]);
    } else if (components.length > 1) {
      regions.set(digit, components[0]);
    }
  }
  return regions;
}

function findMovingBlockRegionsFromGrid(rows: string[]): Map<string, ComponentRect> {
  const tiles: TileCell[] = [];
  for (let ty = 0; ty < rows.length; ty += 1) {
    for (let tx = 0; tx < rows[ty].length; tx += 1) {
      tiles.push({ tx, ty, token: rows[ty][tx] });
    }
  }
  return findMovingBlockRegions(tiles);
}

function componentToRect(component: TileCell[]): RectSpec {
  const txs = component.map(cell => cell.tx);
  const tys = component.map(cell => cell.ty);
  const minX = Math.min(...txs);
  const maxX = Math.max(...txs);
  const minY = Math.min(...tys);
  const maxY = Math.max(...tys);
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

function findComponentsFromGrid(rows: string[], tokens: string[]): ComponentRect[] {
  const tiles: TileCell[] = [];
  for (let ty = 0; ty < rows.length; ty += 1) {
    for (let tx = 0; tx < rows[ty].length; tx += 1) {
      tiles.push({ tx, ty, token: rows[ty][tx] });
    }
  }
  return findComponents(tiles, tokens);
}

function findRuns(tiles: TileCell[], tokens: string[]): TileCell[][] {
  const runs: TileCell[][] = [];
  const seen = new Set<string>();
  for (const tile of tiles) {
    if (!tokens.includes(tile.token)) continue;
    const id = key(tile.tx, tile.ty);
    if (seen.has(id)) continue;

    const run: TileCell[] = [];
    const stack = [tile];
    seen.add(id);

    while (stack.length) {
      const current = stack.pop();
      if (!current) break;
      run.push(current);
      const neighbors = [
        { tx: current.tx + 1, ty: current.ty },
        { tx: current.tx - 1, ty: current.ty },
        { tx: current.tx, ty: current.ty + 1 },
        { tx: current.tx, ty: current.ty - 1 }
      ];
      for (const neighbor of neighbors) {
        if (!inBounds(neighbor.tx, neighbor.ty)) continue;
        const neighborId = key(neighbor.tx, neighbor.ty);
        if (seen.has(neighborId)) continue;
        const neighborTile = tiles[toIndex(neighbor.tx, neighbor.ty)];
        if (!neighborTile || !tokens.includes(neighborTile.token)) continue;
        seen.add(neighborId);
        stack.push(neighborTile);
      }
    }

    runs.push(run);
  }

  return runs;
}

function extractCurrents(rows: string[]): Array<RectSpec & { direction: 'up' | 'down' | 'left' | 'right' }> {
  const currents: Array<RectSpec & { direction: 'up' | 'down' | 'left' | 'right' }> = [];
  for (let ty = 0; ty < rows.length; ty += 1) {
    for (let tx = 0; tx < rows[ty].length; tx += 1) {
      const token = rows[ty][tx];
      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      if (token === '^') direction = 'up';
      if (token === 'v') direction = 'down';
      if (token === '<') direction = 'left';
      if (token === '>') direction = 'right';
      if (!direction) continue;
      currents.push({ x: tx, y: ty, w: 1, h: 1, direction });
    }
  }
  return currents;
}
