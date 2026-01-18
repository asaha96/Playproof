/**
 * Archery GridLevel Sanitizer
 * Fixes common LLM mistakes before validation to increase success rate
 */

import type { GridLevel } from '@playproof/shared';

const GRID_COLS = 20;
const GRID_ROWS = 14;

// Bow zone
const BOW_ZONE = { minX: 1, maxX: 4, minY: 4, maxY: 10 };
// Target zone
const TARGET_ZONE = { minX: 15, maxX: 18, minY: 3, maxY: 11 };
// Obstacle zone
const OBSTACLE_ZONE = { minX: 5, maxX: 14, minY: 1, maxY: 12 };

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

export function sanitizeArcheryGridLevel(level: GridLevel): SanitizeResult {
  const fixes: string[] = [];
  
  // Deep clone the tiles array
  const tiles = level.grid.tiles.map(row => row);
  
  // 1. Find bow and target positions
  let bow = findPosition(tiles, 'B');
  let target = findPosition(tiles, 'T');
  
  // 2. Fix bow position if outside valid zone
  if (bow) {
    const validCol = bow.col >= BOW_ZONE.minX && bow.col <= BOW_ZONE.maxX;
    const validRow = bow.row >= BOW_ZONE.minY && bow.row <= BOW_ZONE.maxY;
    
    if (!validCol || !validRow) {
      // Remove bow from invalid position
      setTile(tiles, bow.row, bow.col, '.');
      fixes.push(`Removed bow from invalid position (${bow.col}, ${bow.row})`);
      
      // Place bow in valid position
      const newCol = Math.min(Math.max(bow.col, BOW_ZONE.minX), BOW_ZONE.maxX);
      const newRow = Math.min(Math.max(bow.row, BOW_ZONE.minY), BOW_ZONE.maxY);
      setTile(tiles, newRow, newCol, 'B');
      bow = { col: newCol, row: newRow };
      fixes.push(`Moved bow to valid position (${newCol}, ${newRow})`);
    }
  } else {
    // Add bow if missing
    const defaultCol = 2;
    const defaultRow = 6;
    setTile(tiles, defaultRow, defaultCol, 'B');
    bow = { col: defaultCol, row: defaultRow };
    fixes.push(`Added missing bow at (${defaultCol}, ${defaultRow})`);
  }
  
  // 3. Fix target position if outside valid zone
  if (target) {
    const validCol = target.col >= TARGET_ZONE.minX && target.col <= TARGET_ZONE.maxX;
    const validRow = target.row >= TARGET_ZONE.minY && target.row <= TARGET_ZONE.maxY;
    
    if (!validCol || !validRow) {
      // Remove target from invalid position
      setTile(tiles, target.row, target.col, '.');
      fixes.push(`Removed target from invalid position (${target.col}, ${target.row})`);
      
      // Place target in valid position
      const newCol = Math.min(Math.max(target.col, TARGET_ZONE.minX), TARGET_ZONE.maxX);
      const newRow = Math.min(Math.max(target.row, TARGET_ZONE.minY), TARGET_ZONE.maxY);
      setTile(tiles, newRow, newCol, 'T');
      target = { col: newCol, row: newRow };
      fixes.push(`Moved target to valid position (${newCol}, ${newRow})`);
    }
  } else {
    // Add target if missing
    const defaultCol = 16;
    const defaultRow = 6;
    setTile(tiles, defaultRow, defaultCol, 'T');
    target = { col: defaultCol, row: defaultRow };
    fixes.push(`Added missing target at (${defaultCol}, ${defaultRow})`);
  }
  
  // 4. Clear bow draw pocket (3x3 around bow, Chebyshev <= 1)
  if (bow) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(bow, { col, row }) <= 1 && token === '#') {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared bow draw pocket at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 5. Clear target clearance area (3x3 around target, Chebyshev <= 1)
  if (target) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const token = getTile(tiles, row, col);
        if (chebyshev(target, { col, row }) <= 1 && token === '#') {
          setTile(tiles, row, col, '.');
          fixes.push(`Cleared target clearance at (${col}, ${row})`);
        }
      }
    }
  }
  
  // 6. Remove obstacles outside allowed zone (cols 5-14, rows 1-12)
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
  
  // 7. Replace invalid tokens with dots (keep only ., B, T, #)
  const validTokens = new Set(['.', 'B', 'T', '#']);
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
