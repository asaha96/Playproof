/**
 * Basketball GridLevel Sanitizer
 * Fixes common LLM mistakes before validation to increase success rate
 */

import type { GridLevel } from '@playproof/shared';

const GRID_COLS = 20;
const GRID_ROWS = 14;

// Ball spawn zone
const BALL_ZONE = { minX: 1, maxX: 5, minY: 8, maxY: 12 };
// Hoop zone
const HOOP_ZONE = { minX: 14, maxX: 18, minY: 2, maxY: 6 };
// Obstacle zone
const OBSTACLE_ZONE = { minX: 6, maxX: 13, minY: 1, maxY: 12 };

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

export function sanitizeBasketballGridLevel(level: GridLevel): SanitizeResult {
  const fixes: string[] = [];
  
  // Deep clone the tiles array
  const tiles = level.grid.tiles.map(row => row);
  
  // 1. Find ball and hoop positions
  let ball = findPosition(tiles, 'B');
  let hoop = findPosition(tiles, 'H');
  
  // 2. Fix ball position if outside valid zone
  if (ball) {
    const validCol = ball.col >= BALL_ZONE.minX && ball.col <= BALL_ZONE.maxX;
    const validRow = ball.row >= BALL_ZONE.minY && ball.row <= BALL_ZONE.maxY;
    
    if (!validCol || !validRow) {
      // Remove ball from invalid position
      setTile(tiles, ball.row, ball.col, '.');
      fixes.push(`Removed ball from invalid position (${ball.col}, ${ball.row})`);
      
      // Place ball in valid position
      const newCol = Math.min(Math.max(ball.col, BALL_ZONE.minX), BALL_ZONE.maxX);
      const newRow = Math.min(Math.max(ball.row, BALL_ZONE.minY), BALL_ZONE.maxY);
      setTile(tiles, newRow, newCol, 'B');
      ball = { col: newCol, row: newRow };
      fixes.push(`Moved ball to valid position (${newCol}, ${newRow})`);
    }
  } else {
    // Add ball if missing
    const defaultCol = 3;
    const defaultRow = 10;
    setTile(tiles, defaultRow, defaultCol, 'B');
    ball = { col: defaultCol, row: defaultRow };
    fixes.push(`Added missing ball at (${defaultCol}, ${defaultRow})`);
  }
  
  // 3. Fix hoop position if outside valid zone
  if (hoop) {
    const validCol = hoop.col >= HOOP_ZONE.minX && hoop.col <= HOOP_ZONE.maxX;
    const validRow = hoop.row >= HOOP_ZONE.minY && hoop.row <= HOOP_ZONE.maxY;
    
    if (!validCol || !validRow) {
      // Remove hoop from invalid position
      setTile(tiles, hoop.row, hoop.col, '.');
      fixes.push(`Removed hoop from invalid position (${hoop.col}, ${hoop.row})`);
      
      // Place hoop in valid position
      const newCol = Math.min(Math.max(hoop.col, HOOP_ZONE.minX), HOOP_ZONE.maxX);
      const newRow = Math.min(Math.max(hoop.row, HOOP_ZONE.minY), HOOP_ZONE.maxY);
      setTile(tiles, newRow, newCol, 'H');
      hoop = { col: newCol, row: newRow };
      fixes.push(`Moved hoop to valid position (${newCol}, ${newRow})`);
    }
  } else {
    // Add hoop if missing
    const defaultCol = 16;
    const defaultRow = 3;
    setTile(tiles, defaultRow, defaultCol, 'H');
    hoop = { col: defaultCol, row: defaultRow };
    fixes.push(`Added missing hoop at (${defaultCol}, ${defaultRow})`);
  }
  
  // 4. Clear ball spawn area (5x5 around ball, Chebyshev <= 2)
  if (ball) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(ball, { col, row }) <= 2 && token === '#') {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared ball spawn area at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 5. Clear hoop clearance area (3x3 around hoop, Chebyshev <= 1)
  if (hoop) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(hoop, { col, row }) <= 1 && token === '#') {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared hoop clearance at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 6. Remove obstacles outside allowed zone (cols 6-13, rows 1-12)
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const token = getTile(tiles, row, col);
      if (token === '#') {
        const inZone = col >= OBSTACLE_ZONE.minX && col <= OBSTACLE_ZONE.maxX &&
                       row >= OBSTACLE_ZONE.minY && row <= OBSTACLE_ZONE.maxY;
        if (!inZone) {
          setTile(tiles, row, col, '.');
          fixes.push(`Removed obstacle outside allowed zone at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 7. Replace invalid tokens with dots
  const validTokens = new Set(['.', 'B', 'H', '#']);
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const token = getTile(tiles, row, col);
      if (!validTokens.has(token)) {
        setTile(tiles, row, col, '.');
        fixes.push(`Replaced invalid token '${token}' at (${col}, ${row})`);
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
