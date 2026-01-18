/**
 * GridLevel Sanitizer
 * Fixes common LLM mistakes before validation to increase success rate
 */

import type { GridLevel } from '@playproof/shared';

const GRID_COLS = 20;
const GRID_ROWS = 14;

// Tokens that must be cleared from tee pocket (Chebyshev <= 2 from ball)
const TEE_POCKET_FORBIDDEN = new Set(['#', '~', '^', 'v', '<', '>', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

// Tokens that must be cleared from hole clearance (Chebyshev <= 1 from hole)
const HOLE_CLEARANCE_FORBIDDEN = new Set(['#', '~', '^', 'v', '<', '>', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

interface SanitizeResult {
  level: GridLevel;
  fixes: string[];
}

interface Position {
  col: number;
  row: number;
}

function chebyshev(a: Position, b: Position): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

function findPosition(tiles: string[], token: string): Position | null {
  for (let row = 0; row < tiles.length; row++) {
    const col = tiles[row].indexOf(token);
    if (col !== -1) {
      return { col, row };
    }
  }
  return null;
}

function setTile(tiles: string[], row: number, col: number, token: string): void {
  if (row >= 0 && row < tiles.length && col >= 0 && col < tiles[row].length) {
    tiles[row] = tiles[row].substring(0, col) + token + tiles[row].substring(col + 1);
  }
}

function getTile(tiles: string[], row: number, col: number): string {
  if (row >= 0 && row < tiles.length && col >= 0 && col < tiles[row].length) {
    return tiles[row][col];
  }
  return '.';
}

export function sanitizeGridLevel(level: GridLevel): SanitizeResult {
  const fixes: string[] = [];
  
  // Deep clone the tiles array
  const tiles = level.grid.tiles.map(row => row);
  
  // 1. Force border rows/cols to dots
  for (let col = 0; col < GRID_COLS; col++) {
    if (getTile(tiles, 0, col) !== '.' && getTile(tiles, 0, col) !== 'B' && getTile(tiles, 0, col) !== 'H') {
      setTile(tiles, 0, col, '.');
      fixes.push(`Cleared border tile at (${col}, 0)`);
    }
    if (getTile(tiles, GRID_ROWS - 1, col) !== '.' && getTile(tiles, GRID_ROWS - 1, col) !== 'B' && getTile(tiles, GRID_ROWS - 1, col) !== 'H') {
      setTile(tiles, GRID_ROWS - 1, col, '.');
      fixes.push(`Cleared border tile at (${col}, ${GRID_ROWS - 1})`);
    }
  }
  for (let row = 0; row < GRID_ROWS; row++) {
    if (getTile(tiles, row, 0) !== '.' && getTile(tiles, row, 0) !== 'B' && getTile(tiles, row, 0) !== 'H') {
      setTile(tiles, row, 0, '.');
      fixes.push(`Cleared border tile at (0, ${row})`);
    }
    if (getTile(tiles, row, GRID_COLS - 1) !== '.' && getTile(tiles, row, GRID_COLS - 1) !== 'B' && getTile(tiles, row, GRID_COLS - 1) !== 'H') {
      setTile(tiles, row, GRID_COLS - 1, '.');
      fixes.push(`Cleared border tile at (${GRID_COLS - 1}, ${row})`);
    }
  }
  
  // 2. Find ball and hole positions
  const ball = findPosition(tiles, 'B');
  const hole = findPosition(tiles, 'H');
  
  // 3. Clear tee pocket (Chebyshev <= 2 from ball)
  if (ball) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(ball, { col, row }) <= 2 && TEE_POCKET_FORBIDDEN.has(token)) {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared tee pocket at (${col}, ${row}) - was '${token}'`);
        }
      }
    }
  }
  
  // 4. Clear hole clearance (Chebyshev <= 1 from hole)
  if (hole) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(hole, { col, row }) <= 1 && HOLE_CLEARANCE_FORBIDDEN.has(token)) {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared hole clearance at (${col}, ${row}) - was '${token}'`);
        }
      }
    }
  }
  
  // 5. Walls can be any shape now - no rectangle validation needed
  // Each '#' tile is rendered as a 1x1 wall block
  
  // 6. Remove currents outside allowed band (cols 6-13, rows 2-11)
  const currentTokens = new Set(['^', 'v', '<', '>']);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const token = getTile(tiles, row, col);
      if (currentTokens.has(token)) {
        if (col < 6 || col > 13 || row < 2 || row > 11) {
          setTile(tiles, row, col, '.');
          fixes.push(`Removed current '${token}' outside allowed band at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 7. Remove water outside allowed region (cols 2-17, rows 2-11) or too close to ball
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const token = getTile(tiles, row, col);
      if (token === '~') {
        if (col < 2 || col > 17 || row < 2 || row > 11) {
          setTile(tiles, row, col, '.');
          fixes.push(`Removed water outside allowed region at (${col}, ${row})`);
        } else if (ball && chebyshev(ball, { col, row }) <= 3) {
          setTile(tiles, row, col, '.');
          fixes.push(`Removed water too close to ball at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 8. Remove walls outside allowed region (cols 1-18, rows 1-12)
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const token = getTile(tiles, row, col);
      if (token === '#') {
        if (col < 1 || col > 18 || row < 1 || row > 12) {
          setTile(tiles, row, col, '.');
          fixes.push(`Removed wall outside allowed region at (${col}, ${row})`);
        }
      }
    }
  }
  
  // Return sanitized level
  return {
    level: {
      ...level,
      grid: {
        ...level.grid,
        tiles
      }
    },
    fixes
  };
}
