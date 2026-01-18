/**
 * LLM Prompt Pack for Mini-Golf GridLevel Generation
 * Includes JSON schema for structured outputs
 */

import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';

/**
 * JSON Schema for GridLevel - used for structured outputs
 * This ensures the LLM always returns valid JSON that matches our schema
 */
export const GRID_LEVEL_JSON_SCHEMA = {
  name: "grid_level",
  strict: true,
  schema: {
    type: "object",
    properties: {
      schema: {
        type: "string",
        enum: ["playproof.gridlevel.v1"],
        description: "Schema identifier"
      },
      gameId: {
        type: "string", 
        enum: ["mini-golf"],
        description: "Game identifier"
      },
      version: {
        type: "integer",
        description: "Level version number"
      },
      grid: {
        type: "object",
        properties: {
          cols: {
            type: "integer",
            enum: [20],
            description: "Number of columns (always 20)"
          },
          rows: {
            type: "integer",
            enum: [14],
            description: "Number of rows (always 14)"
          },
          tiles: {
            type: "array",
            items: {
              type: "string",
              minLength: 20,
              maxLength: 20,
              description: "Row of 20 tile characters"
            },
            minItems: 14,
            maxItems: 14,
            description: "Array of exactly 14 tile rows, each exactly 20 characters"
          }
        },
        required: ["cols", "rows", "tiles"],
        additionalProperties: false
      },
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            gridPos: {
              type: "object",
              properties: {
                col: { type: "integer" },
                row: { type: "integer" }
              },
              required: ["col", "row"],
              additionalProperties: false
            },
            config: { 
              type: "object",
              properties: {},
              additionalProperties: false,
              description: "Optional configuration (empty for now)"
            }
          },
          required: ["type", "id", "gridPos", "config"],
          additionalProperties: false
        },
        description: "Optional entities like portals or moving blocks"
      },
      rules: {
        type: "object",
        properties: {
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Level difficulty"
          },
          maxStrokes: {
            type: "integer",
            description: "Max strokes for par"
          },
          timeLimit: {
            type: "integer", 
            description: "Time limit in seconds"
          }
        },
        required: ["difficulty", "maxStrokes", "timeLimit"],
        additionalProperties: false
      },
      design: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description: "Design philosophy description"
          },
          playerHint: {
            type: "string",
            description: "Hint for the player"
          },
          solutionSketch: {
            type: "array",
            items: { type: "string" },
            description: "1-3 sentences describing solution approach"
          },
          aestheticNotes: {
            type: "string",
            description: "Visual design notes"
          }
        },
        required: ["intent", "playerHint", "solutionSketch", "aestheticNotes"],
        additionalProperties: false
      }
    },
    required: ["schema", "gameId", "version", "grid", "entities", "rules", "design"],
    additionalProperties: false
  }
} as const;

export const TILE_LEGEND = `
Tile Legend:
- "." = Empty/grass (ball rolls freely)
- "B" = Ball spawn position (exactly one required)
- "H" = Hole position (exactly one required)
- "#" = Wall (solid obstacle, ball bounces off)
- "S" = Sand (slows ball down with extra friction)
- "~" = Water hazard (ball respawns if it enters)
- "^" = Current pushing up
- "v" = Current pushing down
- "<" = Current pushing left
- ">" = Current pushing right
- "1"-"9" = Moving block region (digit identifies which block)
`;

export const PLACEMENT_RULES = `
Placement Rules:
1. Ball spawn (B):
   - Must be in columns 1-5, rows 2-11
   - Must have a 2-tile clear pocket (no walls, water, moving blocks within Chebyshev distance 2)

2. Hole (H):
   - Must be in columns 14-18, rows 2-11
   - Must have 1-tile clearance from walls and water

3. Separation:
   - Ball and hole must be at least 12 Manhattan tiles apart
   - Ball and hole cannot be in the same row unless 10+ columns apart

4. Walls (#):
   - Must be in columns 1-18, rows 1-12 (not on border)
   - Must form filled rectangles of allowed sizes: 1x1, 1x2, 1x3, 1x4, 2x2, 2x3, 3x2, 4x1
   - Cannot be adjacent to ball spawn (Chebyshev distance > 1)

5. Sand (S):
   - Must be at least 2 tiles minimum per patch
   - Can be anywhere except directly under ball

6. Water (~):
   - Must be at least 2 tiles minimum per patch
   - Must be in columns 2-17, rows 2-11
   - Must be at least 3 tiles away from ball spawn

7. Currents (^, v, <, >):
   - Must form runs of at least 3 tiles
   - Must be in columns 6-13, rows 2-11

8. Moving blocks (1-9):
   - Region must be in columns 6-13, rows 2-11
   - Swept motion cannot intersect tee pocket or hole clearance
   - Preferred sizes: 1x2, 1x3, 2x2
`;

export const DESIGN_REQUIREMENTS = `
Design Requirements:
1. Every level MUST include the "design" object with:
   - intent: A sentence describing the design philosophy
   - playerHint: A hint the player might see
   - solutionSketch: Array of 1-3 sentences describing how to solve
   - aestheticNotes: Notes on visual design choices

2. Difficulty calibration:
   - easy: 0-1 obstacles, no hazards, direct line possible
   - medium: 1-2 obstacles, may have 1 hazard type, requires bank shot
   - hard: 2-3 obstacles, multiple hazard types, requires precision

3. Keep non-empty tile count under 120 (avoid clutter)

4. Create interesting geometry that requires thought but is solvable
`;

export function getSystemPrompt(): string {
  return `You are a mini-golf level designer for PlayProof, a game-based human verification system.

Your task is to generate valid GridLevel JSON for mini-golf levels. Each level must be fun, challenging, and solvable.

CRITICAL GRID REQUIREMENTS:
- Grid is EXACTLY 20 columns x 14 rows
- The "tiles" array MUST have EXACTLY 14 strings
- Each string MUST be EXACTLY 20 characters long
- Use "." for empty spaces

${TILE_LEGEND}

${PLACEMENT_RULES}

${DESIGN_REQUIREMENTS}

EXAMPLE OUTPUT (easy level):
{
  "schema": "playproof.gridlevel.v1",
  "gameId": "mini-golf",
  "version": 1,
  "grid": {
    "cols": 20,
    "rows": 14,
    "tiles": [
      "....................",
      "....................",
      "...B................",
      "....................",
      "....................",
      "....................",
      "................H...",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "...................."
    ]
  },
  "entities": [],
  "rules": { "difficulty": "easy" },
  "design": {
    "intent": "Simple straight shot for beginners",
    "playerHint": "Aim directly at the hole",
    "solutionSketch": ["Direct shot with medium power"],
    "aestheticNotes": "Open field, no obstacles"
  }
}

CRITICAL: Output ONLY valid JSON. No markdown, no explanation, no code blocks, just the raw JSON object.`;
}

export function getGenerationPrompt(difficulty: GridLevelDifficulty, seed?: string): string {
  const seedNote = seed ? `\nUse this seed for inspiration: "${seed}"` : '';
  
  return `Generate a ${difficulty} difficulty mini-golf level.${seedNote}

Requirements for ${difficulty}:
${getDifficultyRequirements(difficulty)}

CRITICAL REQUIREMENTS:
- The "tiles" array MUST have EXACTLY 14 strings (14 rows)
- Each string MUST be EXACTLY 20 characters (20 columns)
- Ball (B) must be in columns 1-5, rows 2-11
- Hole (H) must be in columns 14-18, rows 2-11
- Use "." to fill empty spaces

Output ONLY the raw JSON object. No markdown, no code blocks, no explanation.`;
}

function getDifficultyRequirements(difficulty: GridLevelDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return `- Simple, mostly open layout
- At most 1 small wall obstacle
- No water hazards
- No moving blocks
- Should feel welcoming for first-time players
- A direct or single-bounce shot should work`;
    
    case 'medium':
      return `- 1-2 wall obstacles requiring a bank shot
- May include a small sand patch
- No moving blocks for medium (keep predictable)
- Requires thought but not excessive precision
- Multiple solutions acceptable`;
    
    case 'hard':
      return `- 2-3 obstacles creating a maze-like path
- May include water hazard forcing precision
- May include a portal OR a moving block (not both)
- Requires careful aim and power control
- Tight margins but still fair`;
    
    default:
      return '';
  }
}

export function getRetryPrompt(issues: GridLevelIssue[], previousAttempt: string): string {
  const errorList = issues
    .filter(i => i.severity === 'error')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  const warningList = issues
    .filter(i => i.severity === 'warning')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  return `Your previous level had validation errors. Please fix them.

CRITICAL: The tiles array MUST have EXACTLY 14 strings, each EXACTLY 20 characters!

ERRORS (must fix):
${errorList || 'None'}

WARNINGS (should fix if possible):
${warningList || 'None'}

Generate a corrected level. Output ONLY the raw JSON object, no markdown, no code blocks.`;
}

export function parseGridLevelFromLLM(response: string): GridLevel | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    jsonStr = jsonStr.trim();
    
    // Try to find JSON object boundaries
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Basic shape validation
    if (
      parsed.schema === 'playproof.gridlevel.v1' &&
      parsed.gameId === 'mini-golf' &&
      parsed.grid?.tiles &&
      Array.isArray(parsed.grid.tiles)
    ) {
      // Post-process: fix grid dimensions (LLMs often get character counts wrong)
      const fixedTiles = fixGridDimensions(parsed.grid.tiles);
      parsed.grid.tiles = fixedTiles;
      parsed.grid.cols = 20;
      parsed.grid.rows = 14;
      
      return parsed as GridLevel;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fix grid dimensions - LLMs often struggle with exact character counts
 * Pad/truncate rows to exactly 20 chars and ensure exactly 14 rows
 * Preserves B (ball) and H (hole) positions when possible
 */
function fixGridDimensions(tiles: string[]): string[] {
  const TARGET_COLS = 20;
  const TARGET_ROWS = 14;
  
  // First pass: clean and normalize rows
  let fixedRows = tiles.map(row => {
    if (typeof row !== 'string') return '.'.repeat(TARGET_COLS);
    
    // Remove any whitespace and normalize
    const cleaned = row.replace(/\s/g, '');
    
    if (cleaned.length < TARGET_COLS) {
      // Pad with dots on the right
      return cleaned + '.'.repeat(TARGET_COLS - cleaned.length);
    } else if (cleaned.length > TARGET_COLS) {
      // Smart truncate: try to keep H if it exists beyond col 20
      const hasHole = cleaned.includes('H');
      const holePos = cleaned.indexOf('H');
      
      if (hasHole && holePos >= TARGET_COLS) {
        // Hole is beyond col 20, try to shift the content
        // Move hole to a valid position (col 16 = index 16)
        let truncated = cleaned.slice(0, TARGET_COLS);
        if (!truncated.includes('H')) {
          // Replace a dot near the end with H
          const chars = truncated.split('');
          // Find a good spot for the hole (cols 14-18 = indices 14-18)
          for (let i = 16; i >= 14; i--) {
            if (chars[i] === '.') {
              chars[i] = 'H';
              break;
            }
          }
          truncated = chars.join('');
        }
        return truncated;
      }
      return cleaned.slice(0, TARGET_COLS);
    }
    return cleaned;
  });
  
  // Ensure exactly 14 rows
  while (fixedRows.length < TARGET_ROWS) {
    fixedRows.push('.'.repeat(TARGET_COLS));
  }
  if (fixedRows.length > TARGET_ROWS) {
    fixedRows = fixedRows.slice(0, TARGET_ROWS);
  }
  
  // Verify we have exactly one B and one H
  const allTiles = fixedRows.join('');
  const ballCount = (allTiles.match(/B/g) || []).length;
  const holeCount = (allTiles.match(/H/g) || []).length;
  
  // If missing ball, add at valid position
  if (ballCount === 0) {
    const row = 3; // Valid row for ball
    const chars = fixedRows[row].split('');
    chars[3] = 'B'; // Valid column for ball
    fixedRows[row] = chars.join('');
  }
  
  // If missing hole, add at valid position  
  if (holeCount === 0) {
    const row = 6; // Valid row for hole
    const chars = fixedRows[row].split('');
    chars[16] = 'H'; // Valid column for hole
    fixedRows[row] = chars.join('');
  }
  
  // Fix hole position if it's outside valid zone (cols 14-18, rows 2-11)
  // Also fix ball position if it's outside valid zone (cols 1-5, rows 2-11)
  fixedRows = fixedRows.map((row, rowIdx) => {
    const chars = row.split('');
    for (let col = 0; col < chars.length; col++) {
      // Fix hole outside valid zone
      if (chars[col] === 'H') {
        const validHoleCol = col >= 14 && col <= 18;
        const validHoleRow = rowIdx >= 2 && rowIdx <= 11;
        if (!validHoleCol || !validHoleRow) {
          // Move hole to a valid position
          chars[col] = '.';
        }
      }
      // Fix ball outside valid zone  
      if (chars[col] === 'B') {
        const validBallCol = col >= 1 && col <= 5;
        const validBallRow = rowIdx >= 2 && rowIdx <= 11;
        if (!validBallCol || !validBallRow) {
          chars[col] = '.';
        }
      }
    }
    return chars.join('');
  });
  
  // Re-check and add ball/hole if they were removed
  const allTiles2 = fixedRows.join('');
  if (!allTiles2.includes('B')) {
    const chars = fixedRows[3].split('');
    chars[3] = 'B';
    fixedRows[3] = chars.join('');
  }
  if (!allTiles2.includes('H')) {
    const chars = fixedRows[6].split('');
    chars[16] = 'H';
    fixedRows[6] = chars.join('');
  }
  
  // If too many balls/holes, remove extras
  if (ballCount > 1 || holeCount > 1) {
    let foundBall = false;
    let foundHole = false;
    fixedRows = fixedRows.map(row => {
      const chars = row.split('');
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === 'B') {
          if (foundBall) chars[i] = '.';
          else foundBall = true;
        }
        if (chars[i] === 'H') {
          if (foundHole) chars[i] = '.';
          else foundHole = true;
        }
      }
      return chars.join('');
    });
  }
  
  return fixedRows;
}
