/**
 * LLM Prompt Pack for Mini-Golf GridLevel Generation
 * Includes JSON schema for structured outputs
 * 
 * 2-stage pipeline:
 * 1. Generate intent (design brief) for the level
 * 2. Generate level based on intent
 */

import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';

/**
 * Intent object - design brief for level generation
 */
export interface LevelIntent {
  intent: string;           // 1-sentence design philosophy
  playerHint: string;       // 1-sentence hint for player
  solutionSketch: string[]; // 1-3 sentences describing solution approach
  aestheticNotes: string;   // Visual design notes
  layoutDirective: string;  // Obstacle arrangement guidance
}

/**
 * JSON Schema for LevelIntent - used for intent generation
 */
export const LEVEL_INTENT_JSON_SCHEMA = {
  name: "level_intent",
  strict: true,
  schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "One sentence describing the core design philosophy (e.g., 'Precision threading through narrow corridor')"
      },
      playerHint: {
        type: "string",
        description: "One sentence hint for the player (e.g., 'Thread the needle between obstacles')"
      },
      solutionSketch: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 3,
        description: "1-3 sentences describing how to solve the level"
      },
      aestheticNotes: {
        type: "string",
        description: "Brief visual/layout notes (e.g., 'Clean geometric shapes, diagonal sight lines')"
      },
      layoutDirective: {
        type: "string",
        description: "Specific obstacle arrangement guidance (e.g., 'Two 2x3 walls forming S-curve in center')"
      }
    },
    required: ["intent", "playerHint", "solutionSketch", "aestheticNotes", "layoutDirective"],
    additionalProperties: false
  }
} as const;

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
      seed: {
        type: "string",
        description: "Optional seed identifier for the level"
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
    required: ["schema", "gameId", "version", "seed", "grid", "entities", "rules", "design"],
    additionalProperties: false
  }
} as const;

export const TILE_LEGEND = `
Tile Legend:
- "." = Empty/grass (ball rolls freely)
- "B" = Ball spawn position (exactly one required)
- "H" = Hole position (exactly one required)
- "#" = Wall (solid obstacle, ball bounces off)
- "~" = Water hazard (ball respawns if it enters)
- "^" = Current pushing up
- "v" = Current pushing down
- "<" = Current pushing left
- ">" = Current pushing right
- "1"-"9" = Moving block region (digit identifies which block)
`;

export const PLACEMENT_RULES = `
PLACEMENT RULES:

1. Ball spawn (B):
   - MUST be in columns 1-5, rows 2-11
   - TEE POCKET: All tiles within Chebyshev distance 2 of B MUST be "." or "B" only

2. Hole (H):
   - MUST be in columns 14-18, rows 2-11  
   - HOLE CLEARANCE: All 8 tiles adjacent to H (Chebyshev distance 1) MUST be "." or "H" only

3. Separation:
   - Ball and hole MUST be at least 12 Manhattan tiles apart

4. Walls (#):
   - MUST be in columns 1-18, rows 1-12 (NOT on grid border)
   - MUST form FILLED rectangles (no hollow boxes, no outlines, no frames)
   - Allowed sizes: 2x2, 2x3, 2x4, 3x2, 3x3, 3x4, 4x2, 4x3, 1x3, 1x4, 4x1
   - Walls can touch/merge - the system will automatically split them into valid rectangles

5. Water (~):
   - MUST be at least 2 tiles per patch
   - MUST be in columns 2-17, rows 2-11
   - MUST be at least 4 tiles away from ball spawn

6. Currents (^, v, <, >):
   - MUST form runs of at least 3 tiles in the same direction
   - MUST be in columns 6-13, rows 2-11 ONLY
`;

export const NEVER_LIST = `
=== CRITICAL: NEVER DO THESE ===

1. NEVER place anything on border (row 0, row 13, col 0, col 19) except "."
2. NEVER place #, ~, ^, v, <, >, or digits adjacent to H (the hole needs clearance!)
3. NEVER draw hollow wall boxes like "#...#" - walls must be SOLID FILLED rectangles
4. NEVER place single "#" tiles (minimum wall is 1x3 or 2x2)
5. NEVER place currents (^v<>) outside columns 6-13
6. NEVER place anything except "." within 2 tiles of B (tee pocket must be clear)
7. NEVER use "S" (sand is not supported)
`;

export const CONSTRUCTION_PROCEDURE = `
=== LEVEL CONSTRUCTION PROCEDURE ===

Follow these steps IN ORDER:

STEP 1: Start with a 14x20 grid of all dots
  - Row 0: "...................." (20 dots)
  - Rows 1-12: "...................." (20 dots each)
  - Row 13: "...................." (20 dots)

STEP 2: Place Ball (B) in the LEFT zone
  - Pick a position: col 2-4, row 4-9 (safe zone)
  - Replace that "." with "B"

STEP 3: Place Hole (H) in the RIGHT zone  
  - Pick a position: col 15-17, row 4-9 (safe zone)
  - Make sure all 8 neighbors will remain "." (hole clearance)
  - Replace that "." with "H"

STEP 4: Add obstacles (walls) - ONLY solid filled rectangles
  - Place in the MIDDLE zone (cols 6-13)
  - Each wall must be a filled rectangle like:
    - 2x2: "##" on two adjacent rows
    - 2x3: "##" on three adjacent rows  
    - 3x3: "###" on three adjacent rows
  - Do NOT create outlines or hollow shapes

STEP 5: Verify clearances
  - Check 5x5 area around B: must be all "." except B itself
  - Check 3x3 area around H: must be all "." except H itself
  - If violated, remove the offending obstacle

STEP 6: Output the JSON
`;

export const DESIGN_REQUIREMENTS = `
Design Requirements:
1. Every level MUST include the "design" object with all fields
2. Difficulty calibration:
   - easy: 0-1 small obstacles, direct path possible
   - medium: 1-2 obstacles requiring bank shot
   - hard: 2-3 obstacles, tighter path
3. Keep non-empty tile count under 80 (prefer simplicity)
4. Level must be solvable - there must be a clear path from B to H
`;

export function getSystemPrompt(): string {
  return `You are a mini-golf level designer. Generate valid GridLevel JSON.

=== GRID FORMAT ===
- EXACTLY 20 columns x 14 rows
- "tiles" array: EXACTLY 14 strings, each EXACTLY 20 characters

${TILE_LEGEND}

${NEVER_LIST}

${PLACEMENT_RULES}

${CONSTRUCTION_PROCEDURE}

${DESIGN_REQUIREMENTS}

=== EXAMPLE OUTPUT (medium level with proper clearances) ===
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
      "....................",
      "...B................",
      "....................",
      "....................",
      "..........##........",
      "..........##........",
      "....................",
      "................H...",
      "....................",
      "....................",
      "....................",
      "...................."
    ]
  },
  "entities": [],
  "rules": { "difficulty": "medium", "maxStrokes": 3, "timeLimit": 30 },
  "design": {
    "intent": "Bank shot around central obstacle",
    "playerHint": "Bounce off the wall",
    "solutionSketch": ["Aim right of the wall, let it bounce toward hole"],
    "aestheticNotes": "Clean 2x2 wall block, clear sight lines"
  }
}

Note in the example:
- Ball at (3,3) has clear 5x5 tee pocket (all dots around it)
- Hole at (16,9) has clear 3x3 clearance (all dots around it)  
- Wall is a FILLED 2x2 rectangle (not hollow)
- Border rows (0,13) and cols (0,19) are all dots

Output ONLY valid JSON. No markdown, no code blocks, no explanation.`;
}

export function getGenerationPrompt(difficulty: GridLevelDifficulty, seed?: string): string {
  const seedNote = seed ? `\nTheme inspiration: "${seed}"` : '';
  
  return `Generate a ${difficulty.toUpperCase()} difficulty mini-golf level.${seedNote}

${getDifficultyRequirements(difficulty)}

REMEMBER:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Ball (B): columns 2-4, rows 4-8 (leave room for tee pocket)
- Hole (H): columns 15-17, rows 4-9 (leave room for clearance)
- ALL 8 tiles around H must be "."
- ALL tiles within 2 steps of B must be "."
- Walls must be SOLID FILLED rectangles (no outlines!)
- Border (row 0, row 13, col 0, col 19) must be all "."

Output ONLY the raw JSON object.`;
}

function getDifficultyRequirements(difficulty: GridLevelDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return `EASY LEVEL REQUIREMENTS:
- Mostly open layout (few obstacles)
- At most ONE small wall (2x2 or 2x3)
- NO water hazards
- Direct or single-bounce shot should work
- Keep it simple and welcoming`;
    
    case 'medium':
      return `MEDIUM LEVEL REQUIREMENTS:
- 1-2 wall obstacles (2x2, 2x3, or 3x3)
- Place walls in the middle zone (cols 7-12)
- May include a small water patch (2-4 tiles)
- Requires a bank shot or careful aim
- Multiple solutions acceptable`;
    
    case 'hard':
      return `HARD LEVEL REQUIREMENTS:
- 2-3 obstacles creating a path
- Walls should create interesting geometry
- May include water hazard (4-6 tiles)
- Requires precision and planning
- Still must be clearly solvable`;
    
    default:
      return '';
  }
}

// ============================================================================
// INTENT GENERATION (Stage 1 of 2-stage pipeline)
// ============================================================================

const INTENT_PATTERNS_EASY = [
  'Wide open fairway with optional single obstacle',
  'Gentle introduction with clear sight line to hole',
  'Simple straight shot with one small decorative wall',
  'Beginner-friendly layout with no hazards',
];

const INTENT_PATTERNS_MEDIUM = [
  'S-curve corridor using two staggered walls',
  'Central obstacle requiring bank shot',
  'Water hazard guarding direct path, safe route around',
  'Two-gate chicane for precision threading',
  'Diagonal wall placement creating angular shot',
  'Split path: risky direct vs safe long route',
];

const INTENT_PATTERNS_HARD = [
  'Tight S-curve corridor with three walls',
  'Water hazard with narrow safe lane beside wall',
  'Multiple bank shots required through wall maze',
  'Risk-reward water skirt tempting shorter line',
  'Staggered obstacles creating zigzag path',
  'Precision threading between close-set walls',
  'Two-bounce geometry puzzle',
  'Central fortress with water moat approach',
];

function getIntentPatterns(difficulty: GridLevelDifficulty): string[] {
  switch (difficulty) {
    case 'easy': return INTENT_PATTERNS_EASY;
    case 'medium': return INTENT_PATTERNS_MEDIUM;
    case 'hard': return INTENT_PATTERNS_HARD;
    default: return INTENT_PATTERNS_MEDIUM;
  }
}

export function getIntentSystemPrompt(): string {
  return `You are a creative mini-golf level designer. Your job is to generate a unique design brief (intent) for a level.

The intent describes WHAT the level should feel like and HOW obstacles should be arranged - but you do NOT generate the actual grid yet.

Your output must be a JSON object with these fields:
- intent: One sentence core design philosophy (e.g., "Precision threading through narrow corridor")
- playerHint: One sentence hint for the player (e.g., "Thread the needle")
- solutionSketch: Array of 1-3 sentences describing how to solve
- aestheticNotes: Brief visual notes (e.g., "Clean geometric shapes, diagonal sight lines")
- layoutDirective: Specific obstacle arrangement (e.g., "Two 2x3 walls forming S-curve in center, 3-tile water patch guarding direct path")

CONSTRAINTS TO KEEP IN MIND (for the layoutDirective):
- Walls must be FILLED rectangles, allowed sizes: 2x2, 2x3, 2x4, 3x2, 3x3, 3x4, 1x3, 1x4, 4x1, 4x2, 4x3
- Walls go in columns 6-13 (middle zone), NOT near ball (cols 1-5) or hole (cols 14-18)
- Water must be 2+ tiles, in columns 6-13, at least 4 tiles from ball
- Ball is always on the LEFT (cols 2-4), Hole is always on the RIGHT (cols 15-17)
- Keep it solvable - there must be a clear path!

Be creative but practical. The level generator will follow your layoutDirective literally.

Output ONLY valid JSON. No markdown, no code blocks.`;
}

export function getIntentGenerationPrompt(difficulty: GridLevelDifficulty): string {
  const patterns = getIntentPatterns(difficulty);
  const examplePatterns = patterns.slice(0, 3).map(p => `  - "${p}"`).join('\n');
  
  return `Generate a UNIQUE and CREATIVE design intent for a ${difficulty.toUpperCase()} difficulty mini-golf level.

${getDifficultyRequirements(difficulty)}

EXAMPLE PATTERN IDEAS (for inspiration, create something NEW):
${examplePatterns}

Be creative! Generate a fresh, interesting level concept that hasn't been done before.
The layoutDirective should specify exact wall sizes and approximate positions.

Example layoutDirective formats:
- "Single 2x3 wall at center (col 9-10, row 6-8)"
- "Two 2x2 walls: one at (col 7, row 4), one at (col 11, row 8), creating diagonal path"
- "3x3 wall at center with 2x2 water patch (col 8-9, row 9-10) guarding straight shot"

Output ONLY the JSON object.`;
}

export function getGenerationPromptWithIntent(difficulty: GridLevelDifficulty, intent: LevelIntent): string {
  return `Generate a ${difficulty.toUpperCase()} difficulty mini-golf level that EXACTLY matches this design intent:

=== DESIGN INTENT (YOU MUST FOLLOW THIS) ===
Intent: ${intent.intent}
Player Hint: ${intent.playerHint}
Solution: ${intent.solutionSketch.join(' ')}
Aesthetics: ${intent.aestheticNotes}
Layout: ${intent.layoutDirective}

${getDifficultyRequirements(difficulty)}

CRITICAL RULES:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Ball (B): columns 2-4, rows 4-8 (leave room for tee pocket)
- Hole (H): columns 15-17, rows 4-9 (leave room for clearance)
- ALL 8 tiles around H must be "."
- ALL tiles within 2 steps of B must be "."
- Walls must be SOLID FILLED rectangles (no outlines!)
- Border (row 0, row 13, col 0, col 19) must be all "."

Follow the layoutDirective above for obstacle placement!

The level's "design" object should contain the exact intent, playerHint, solutionSketch, and aestheticNotes from above.

Output ONLY the raw JSON object.`;
}

export function getRetryPromptWithIntent(issues: GridLevelIssue[], previousAttempt: string, intent: LevelIntent): string {
  const errorList = issues
    .filter(i => i.severity === 'error')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  const warningList = issues
    .filter(i => i.severity === 'warning')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  return `Your previous level had validation errors. Generate a CORRECTED level that STILL follows the design intent.

=== DESIGN INTENT (KEEP FOLLOWING THIS) ===
Intent: ${intent.intent}
Layout: ${intent.layoutDirective}

ERRORS TO FIX:
${errorList || 'None'}

${warningList ? `WARNINGS:\n${warningList}` : ''}

COMMON FIXES:
- "hole.clearance": Make sure ALL 8 tiles around H are "." (no walls/water/currents next to hole!)
- "ball.pocket": Make sure ALL tiles within 2 steps of B are "." 
- "wall.size" or "wall.rectangle": Use ONLY solid filled rectangles (2x2, 2x3, 3x3, etc.) - NO hollow boxes!
- "wall.zone": Keep walls in cols 1-18, rows 1-12 (not on border row 0/13 or col 0/19)

Simplify the obstacles if needed to pass validation, but keep the general layout intent.

Output ONLY the raw JSON object.`;
}

export function parseIntentFromLLM(response: string): LevelIntent | null {
  try {
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
    
    // Find JSON boundaries
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Validate required fields
    if (!parsed.intent || !parsed.playerHint || !parsed.layoutDirective) {
      console.log('[parseIntentFromLLM] Missing required fields:', Object.keys(parsed));
      return null;
    }
    
    // Normalize solutionSketch to array
    if (!Array.isArray(parsed.solutionSketch)) {
      parsed.solutionSketch = parsed.solutionSketch ? [parsed.solutionSketch] : ['Find a path to the hole'];
    }
    
    // Default aestheticNotes if missing
    if (!parsed.aestheticNotes) {
      parsed.aestheticNotes = 'Clean geometric layout';
    }
    
    return parsed as LevelIntent;
  } catch (err) {
    console.log('[parseIntentFromLLM] Parse error:', err instanceof Error ? err.message : err);
    console.log('[parseIntentFromLLM] Response preview:', response.slice(0, 500));
    return null;
  }
}

// ============================================================================
// ORIGINAL FUNCTIONS (for backward compatibility / non-intent mode)
// ============================================================================

export function getRetryPrompt(issues: GridLevelIssue[], previousAttempt: string): string {
  const errorList = issues
    .filter(i => i.severity === 'error')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  const warningList = issues
    .filter(i => i.severity === 'warning')
    .map(i => `- ${i.code}: ${i.message}`)
    .join('\n');
  
  return `Your previous level had validation errors. Generate a NEW, SIMPLER level.

ERRORS TO FIX:
${errorList || 'None'}

${warningList ? `WARNINGS:\n${warningList}` : ''}

COMMON FIXES:
- "hole.clearance": Make sure ALL 8 tiles around H are "." (no walls/water/currents next to hole!)
- "ball.pocket": Make sure ALL tiles within 2 steps of B are "." 
- "wall.size" or "wall.rectangle": Use ONLY solid filled rectangles (2x2, 2x3, 3x3, etc.) - NO hollow boxes!
- "wall.zone": Keep walls in cols 1-18, rows 1-12 (not on border row 0/13 or col 0/19)

SAFEST APPROACH: Generate a simpler level with fewer obstacles.

Output ONLY the raw JSON object.`;
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
    
    // Basic shape validation with detailed logging
    const hasSchema = parsed.schema === 'playproof.gridlevel.v1';
    const hasGameId = parsed.gameId === 'mini-golf';
    const hasGrid = !!parsed.grid?.tiles;
    const hasTilesArray = Array.isArray(parsed.grid?.tiles);
    
    if (!hasSchema || !hasGameId || !hasGrid || !hasTilesArray) {
      console.log('[parseGridLevelFromLLM] Validation failed:', {
        hasSchema,
        hasGameId, 
        hasGrid,
        hasTilesArray,
        actualSchema: parsed.schema,
        actualGameId: parsed.gameId,
        keys: Object.keys(parsed)
      });
      return null;
    }
    
    // Post-process: fix grid dimensions (LLMs often get character counts wrong)
    const fixedTiles = fixGridDimensions(parsed.grid.tiles);
    parsed.grid.tiles = fixedTiles;
    parsed.grid.cols = 20;
    parsed.grid.rows = 14;
    
    // Normalize entities - ensure it's always an array
    if (!Array.isArray(parsed.entities)) {
      parsed.entities = [];
    }
    
    // Normalize rules - ensure it exists with at least difficulty
    if (!parsed.rules || typeof parsed.rules !== 'object') {
      parsed.rules = { difficulty: 'medium' };
    }
    
    // Normalize design - ensure required fields exist
    if (!parsed.design || typeof parsed.design !== 'object') {
      parsed.design = {
        intent: 'Generated level',
        playerHint: 'Aim for the hole',
        solutionSketch: ['Find a path to the hole'],
        aestheticNotes: 'Procedurally generated'
      };
    } else {
      // Fill in missing design fields
      if (!parsed.design.intent) parsed.design.intent = 'Generated level';
      if (!parsed.design.playerHint) parsed.design.playerHint = 'Aim for the hole';
      if (!Array.isArray(parsed.design.solutionSketch)) parsed.design.solutionSketch = ['Find a path to the hole'];
      if (!parsed.design.aestheticNotes) parsed.design.aestheticNotes = 'Procedurally generated';
    }
    
    // IMPORTANT: Strip seed from LLM-generated levels
    // Seeds should only exist on golden/fallback levels or user-provided seeds
    // This ensures LLM levels are always recognized as unique/nondeterministic
    delete parsed.seed;
    
    return parsed as GridLevel;
  } catch (err) {
    console.log('[parseGridLevelFromLLM] Parse error:', err instanceof Error ? err.message : err);
    console.log('[parseGridLevelFromLLM] Response preview:', response.slice(0, 500));
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
