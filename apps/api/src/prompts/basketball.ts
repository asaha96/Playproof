/**
 * LLM Prompt Pack for Basketball GridLevel Generation
 * 
 * 2-stage pipeline:
 * 1. Generate intent (design brief) for the level
 * 2. Generate level based on intent
 */

import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';

/**
 * Intent object - design brief for level generation
 */
export interface BasketballLevelIntent {
  intent: string;           // 1-sentence design philosophy
  playerHint: string;       // 1-sentence hint for player
  solutionSketch: string[]; // 1-3 sentences describing solution approach
  aestheticNotes: string;   // Visual design notes
  layoutDirective: string;  // Obstacle arrangement guidance
}

/**
 * JSON Schema for BasketballLevelIntent - used for intent generation
 */
export const BASKETBALL_INTENT_JSON_SCHEMA = {
  name: "basketball_level_intent",
  strict: true,
  schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "One sentence describing the core design philosophy (e.g., 'High arc over central obstacle')"
      },
      playerHint: {
        type: "string",
        description: "One sentence hint for the player (e.g., 'Aim high to clear the wall')"
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
        description: "Brief visual/layout notes (e.g., 'Single obstacle creating challenge')"
      },
      layoutDirective: {
        type: "string",
        description: "Specific obstacle arrangement guidance (e.g., 'Single 2x2 wall at col 10, row 5')"
      }
    },
    required: ["intent", "playerHint", "solutionSketch", "aestheticNotes", "layoutDirective"],
    additionalProperties: false
  }
} as const;

/**
 * JSON Schema for Basketball GridLevel - used for structured outputs
 */
export const BASKETBALL_GRID_LEVEL_JSON_SCHEMA = {
  name: "basketball_grid_level",
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
        enum: ["basketball"],
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
        items: { type: "object" },
        description: "Empty array for basketball (no special entities)"
      },
      rules: {
        type: "object",
        properties: {
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Level difficulty"
          },
          maxShots: {
            type: "integer",
            description: "Max shots allowed"
          }
        },
        required: ["difficulty", "maxShots"],
        additionalProperties: false
      },
      design: {
        type: "object",
        properties: {
          intent: { type: "string" },
          playerHint: { type: "string" },
          solutionSketch: {
            type: "array",
            items: { type: "string" }
          },
          aestheticNotes: { type: "string" }
        },
        required: ["intent", "playerHint", "solutionSketch", "aestheticNotes"],
        additionalProperties: false
      }
    },
    required: ["schema", "gameId", "version", "seed", "grid", "entities", "rules", "design"],
    additionalProperties: false
  }
} as const;

export const BASKETBALL_TILE_LEGEND = `
Tile Legend:
- "." = Empty space (ball flies through)
- "B" = Ball spawn position (exactly one required)
- "H" = Hoop position (exactly one required)
- "#" = Obstacle/wall (ball bounces off or blocks shot)
`;

export const BASKETBALL_PLACEMENT_RULES = `
PLACEMENT RULES:

1. Ball spawn (B):
   - MUST be in columns 1-5, rows 8-12 (bottom-left area)
   - CLEARANCE: All tiles within Chebyshev distance 2 of B MUST be "." or "B" only

2. Hoop (H):
   - MUST be in columns 14-18, rows 2-6 (top-right area)
   - CLEARANCE: All tiles within Chebyshev distance 1 of H MUST be "." or "H" only

3. Separation:
   - Ball and hoop MUST be at least 10 Manhattan tiles apart

4. Obstacles (#):
   - MUST be in the MIDDLE zone only (columns 6-13, rows 1-12)
   - CANNOT be near ball spawn area
   - CANNOT be near hoop area
   - Maximum 20 obstacle tiles per level

5. Grid Format:
   - EXACTLY 20 columns x 14 rows
   - Row 0 = TOP of screen (y=0)
   - Row 13 = BOTTOM of screen (y=13)
`;

export const BASKETBALL_NEVER_LIST = `
=== CRITICAL: NEVER DO THESE ===

1. NEVER place obstacles (#) in columns 0-5 or 14-19 (keep ball and hoop zones clear)
2. NEVER place anything within 2 tiles of B (ball needs launch space)
3. NEVER place anything within 1 tile of H (hoop needs clear space)
4. NEVER place more than 20 obstacle tiles (keep it simple)
5. NEVER place B above row 8 (ball must be in bottom area)
6. NEVER place H below row 6 (hoop must be in top area)
7. NEVER make it impossible to arc a ball over obstacles
`;

export const BASKETBALL_CONSTRUCTION_PROCEDURE = `
=== LEVEL CONSTRUCTION PROCEDURE ===

Follow these steps IN ORDER:

STEP 1: Start with a 14x20 grid of all dots
  - Row 0: "...................." (20 dots)
  - All rows: "...................." (20 dots each)
  - Row 13: "...................." (20 dots)

STEP 2: Place Ball (B) in the BOTTOM-LEFT zone
  - Pick a position: col 2-4, row 9-11 (safe zone)
  - Replace that "." with "B"

STEP 3: Place Hoop (H) in the TOP-RIGHT zone  
  - Pick a position: col 15-17, row 3-5 (safe zone)
  - Make sure all 8 neighbors will remain "." (hoop clearance)
  - Replace that "." with "H"

STEP 4: Add obstacles (walls) - ONLY in middle zone
  - Place in columns 6-13 ONLY
  - Keep obstacles at least 3 tiles from B
  - Keep obstacles at least 2 tiles from H
  - Consider the arc needed to reach the hoop

STEP 5: Verify clearances
  - Check 5x5 area around B: must be all "." except B itself
  - Check 3x3 area around H: must be all "." except H itself
  - If violated, remove the offending obstacle

STEP 6: Output the JSON
`;

export function getBasketballSystemPrompt(): string {
  return `You are a basketball game level designer. Generate valid GridLevel JSON.

=== GRID FORMAT ===
- EXACTLY 20 columns x 14 rows
- "tiles" array: EXACTLY 14 strings, each EXACTLY 20 characters
- This is a SIDE VIEW: Row 0 = top of screen, Row 13 = bottom

${BASKETBALL_TILE_LEGEND}

${BASKETBALL_NEVER_LIST}

${BASKETBALL_PLACEMENT_RULES}

${BASKETBALL_CONSTRUCTION_PROCEDURE}

=== PHYSICS CONTEXT ===
The player shoots a ball from the bottom-left toward a hoop in the top-right.
The ball follows a parabolic arc due to gravity.
Obstacles block the ball's flight path.
The player must arc the ball high enough to clear obstacles and reach the hoop.

=== EXAMPLE OUTPUT (medium level with one obstacle) ===
{
  "schema": "playproof.gridlevel.v1",
  "gameId": "basketball",
  "version": 1,
  "seed": "",
  "grid": {
    "cols": 20,
    "rows": 14,
    "tiles": [
      "....................",
      "....................",
      "....................",
      "................H...",
      "....................",
      ".........##.........",
      ".........##.........",
      "....................",
      "....................",
      "....................",
      "...B................",
      "....................",
      "....................",
      "...................."
    ]
  },
  "entities": [],
  "rules": { "difficulty": "medium", "maxShots": 3 },
  "design": {
    "intent": "Arc shot over central obstacle",
    "playerHint": "Aim high to clear the wall",
    "solutionSketch": ["Use a high arc to go over the 2x2 wall"],
    "aestheticNotes": "Simple obstacle creates meaningful challenge"
  }
}

Note in the example:
- Ball at (3,10) in bottom-left zone
- Hoop at (16,3) in top-right zone
- 2x2 obstacle at (9-10, 5-6) in middle zone
- All clearances respected

Output ONLY valid JSON. No markdown, no code blocks, no explanation.`;
}

export function getBasketballGenerationPrompt(difficulty: GridLevelDifficulty, seed?: string): string {
  const seedNote = seed ? `\nTheme inspiration: "${seed}"` : '';
  
  return `Generate a ${difficulty.toUpperCase()} difficulty basketball level.${seedNote}

${getBasketballDifficultyRequirements(difficulty)}

REMEMBER:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Ball (B): columns 2-4, rows 9-11 (bottom-left, leave clearance)
- Hoop (H): columns 15-17, rows 3-5 (top-right, leave clearance)
- ALL tiles within 2 steps of B must be "."
- ALL 8 tiles around H must be "."
- Obstacles ONLY in columns 6-13 (middle zone)

Output ONLY the raw JSON object.`;
}

function getBasketballDifficultyRequirements(difficulty: GridLevelDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return `EASY LEVEL REQUIREMENTS:
- NO obstacles or at most ONE small obstacle (2x2)
- Direct shot path should be clear
- Simple and welcoming for new players
- Focus on getting the mechanics right`;
    
    case 'medium':
      return `MEDIUM LEVEL REQUIREMENTS:
- 1-2 small obstacles (2x2 or 2x3)
- Obstacles in the middle zone requiring arc adjustment
- Player needs to aim higher than direct line
- Still achievable with a good arc shot`;
    
    case 'hard':
      return `HARD LEVEL REQUIREMENTS:
- 2-3 obstacles creating a challenge
- May require precise angle selection
- Obstacles positioned to block obvious shots
- Still must be solvable with correct arc`;
    
    default:
      return '';
  }
}

// ============================================================================
// INTENT GENERATION (Stage 1)
// ============================================================================

const BASKETBALL_INTENT_PATTERNS_EASY = [
  'Wide open court with clear shot to hoop',
  'Simple introduction with no obstacles',
  'Optional decorative obstacle that does not block path',
];

const BASKETBALL_INTENT_PATTERNS_MEDIUM = [
  'Central wall requiring higher arc',
  'Single obstacle forcing angle adjustment',
  'Mid-height obstacle to clear with proper power',
  'Obstacle creating two possible arc paths',
];

const BASKETBALL_INTENT_PATTERNS_HARD = [
  'Multiple obstacles requiring precise arc',
  'Staggered walls creating narrow window',
  'High obstacle forcing maximum arc',
  'Obstacle gauntlet with one viable path',
];

function getBasketballIntentPatterns(difficulty: GridLevelDifficulty): string[] {
  switch (difficulty) {
    case 'easy': return BASKETBALL_INTENT_PATTERNS_EASY;
    case 'medium': return BASKETBALL_INTENT_PATTERNS_MEDIUM;
    case 'hard': return BASKETBALL_INTENT_PATTERNS_HARD;
    default: return BASKETBALL_INTENT_PATTERNS_MEDIUM;
  }
}

export function getBasketballIntentSystemPrompt(): string {
  return `You are a creative basketball level designer. Your job is to generate a unique design brief (intent) for a level.

The intent describes WHAT the level should feel like and HOW obstacles should be arranged - but you do NOT generate the actual grid yet.

Your output must be a JSON object with these fields:
- intent: One sentence core design philosophy (e.g., "High arc over central wall")
- playerHint: One sentence hint for the player (e.g., "Aim high!")
- solutionSketch: Array of 1-3 sentences describing how to solve
- aestheticNotes: Brief visual notes (e.g., "Single clean obstacle")
- layoutDirective: Specific obstacle arrangement (e.g., "2x2 wall at col 9-10, row 5-6")

CONSTRAINTS TO KEEP IN MIND (for the layoutDirective):
- Ball is always in bottom-left (cols 2-4, rows 9-11)
- Hoop is always in top-right (cols 15-17, rows 3-5)
- Obstacles ONLY in middle zone (cols 6-13, rows 1-12)
- Keep it solvable - there must be a valid arc!

Be creative but practical. The level generator will follow your layoutDirective literally.

Output ONLY valid JSON. No markdown, no code blocks.`;
}

export function getBasketballIntentGenerationPrompt(difficulty: GridLevelDifficulty): string {
  const patterns = getBasketballIntentPatterns(difficulty);
  const examplePatterns = patterns.slice(0, 3).map(p => `  - "${p}"`).join('\n');
  
  return `Generate a UNIQUE and CREATIVE design intent for a ${difficulty.toUpperCase()} difficulty basketball level.

${getBasketballDifficultyRequirements(difficulty)}

EXAMPLE PATTERN IDEAS (for inspiration, create something NEW):
${examplePatterns}

Be creative! Generate a fresh, interesting level concept.
The layoutDirective should specify exact obstacle positions.

Example layoutDirective formats:
- "No obstacles, clear shot"
- "Single 2x2 wall at col 9-10, row 5-6"
- "Two obstacles: 2x2 at (col 7, row 4), 2x2 at (col 11, row 7)"

Output ONLY the JSON object.`;
}

export function getBasketballGenerationPromptWithIntent(difficulty: GridLevelDifficulty, intent: BasketballLevelIntent): string {
  return `Generate a ${difficulty.toUpperCase()} difficulty basketball level that EXACTLY matches this design intent:

=== DESIGN INTENT (YOU MUST FOLLOW THIS) ===
Intent: ${intent.intent}
Player Hint: ${intent.playerHint}
Solution: ${intent.solutionSketch.join(' ')}
Aesthetics: ${intent.aestheticNotes}
Layout: ${intent.layoutDirective}

${getBasketballDifficultyRequirements(difficulty)}

CRITICAL RULES:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Ball (B): columns 2-4, rows 9-11 (leave clearance)
- Hoop (H): columns 15-17, rows 3-5 (leave clearance)
- ALL tiles within 2 steps of B must be "."
- ALL 8 tiles around H must be "."
- Obstacles ONLY in columns 6-13

Follow the layoutDirective above for obstacle placement!

The level's "design" object should contain the exact intent, playerHint, solutionSketch, and aestheticNotes from above.

Output ONLY the raw JSON object.`;
}

export function getBasketballRetryPromptWithIntent(issues: GridLevelIssue[], previousAttempt: string, intent: BasketballLevelIntent): string {
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
- "ball.zone": Move B to cols 1-5, rows 8-12
- "ball.clearance": Clear 5x5 area around B
- "hoop.zone": Move H to cols 14-18, rows 2-6  
- "hoop.clearance": Clear 3x3 area around H
- "obstacle.zone": Keep obstacles in cols 6-13 only

Simplify the obstacles if needed to pass validation, but keep the general layout intent.

Output ONLY the raw JSON object.`;
}

export function parseBasketballIntentFromLLM(response: string): BasketballLevelIntent | null {
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
      console.log('[parseBasketballIntentFromLLM] Missing required fields:', Object.keys(parsed));
      return null;
    }
    
    // Normalize solutionSketch to array
    if (!Array.isArray(parsed.solutionSketch)) {
      parsed.solutionSketch = parsed.solutionSketch ? [parsed.solutionSketch] : ['Arc the ball into the hoop'];
    }
    
    // Default aestheticNotes if missing
    if (!parsed.aestheticNotes) {
      parsed.aestheticNotes = 'Clean basketball court';
    }
    
    return parsed as BasketballLevelIntent;
  } catch (err) {
    console.log('[parseBasketballIntentFromLLM] Parse error:', err instanceof Error ? err.message : err);
    console.log('[parseBasketballIntentFromLLM] Response preview:', response.slice(0, 500));
    return null;
  }
}

export function parseBasketballGridLevelFromLLM(response: string): GridLevel | null {
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
    
    // Basic validation
    const hasSchema = parsed.schema === 'playproof.gridlevel.v1';
    const hasGameId = parsed.gameId === 'basketball';
    const hasGrid = !!parsed.grid?.tiles;
    const hasTilesArray = Array.isArray(parsed.grid?.tiles);
    
    if (!hasSchema || !hasGameId || !hasGrid || !hasTilesArray) {
      console.log('[parseBasketballGridLevelFromLLM] Validation failed:', {
        hasSchema, hasGameId, hasGrid, hasTilesArray
      });
      return null;
    }
    
    // Fix grid dimensions
    const fixedTiles = fixBasketballGridDimensions(parsed.grid.tiles);
    parsed.grid.tiles = fixedTiles;
    parsed.grid.cols = 20;
    parsed.grid.rows = 14;
    
    // Normalize entities
    if (!Array.isArray(parsed.entities)) {
      parsed.entities = [];
    }
    
    // Normalize rules
    if (!parsed.rules || typeof parsed.rules !== 'object') {
      parsed.rules = { difficulty: 'medium', maxShots: 3 };
    }
    
    // Normalize design
    if (!parsed.design || typeof parsed.design !== 'object') {
      parsed.design = {
        intent: 'Generated basketball level',
        playerHint: 'Arc the ball into the hoop',
        solutionSketch: ['Find the right angle and power'],
        aestheticNotes: 'Procedurally generated'
      };
    } else {
      if (!parsed.design.intent) parsed.design.intent = 'Generated level';
      if (!parsed.design.playerHint) parsed.design.playerHint = 'Score!';
      if (!Array.isArray(parsed.design.solutionSketch)) parsed.design.solutionSketch = ['Arc the ball'];
      if (!parsed.design.aestheticNotes) parsed.design.aestheticNotes = 'Procedurally generated';
    }
    
    // Strip seed
    delete parsed.seed;
    
    return parsed as GridLevel;
  } catch (err) {
    console.log('[parseBasketballGridLevelFromLLM] Parse error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fix grid dimensions for basketball levels
 */
function fixBasketballGridDimensions(tiles: string[]): string[] {
  const TARGET_COLS = 20;
  const TARGET_ROWS = 14;
  
  // First pass: clean and normalize rows
  let fixedRows = tiles.map(row => {
    if (typeof row !== 'string') return '.'.repeat(TARGET_COLS);
    
    const cleaned = row.replace(/\s/g, '');
    
    if (cleaned.length < TARGET_COLS) {
      return cleaned + '.'.repeat(TARGET_COLS - cleaned.length);
    } else if (cleaned.length > TARGET_COLS) {
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
  const hoopCount = (allTiles.match(/H/g) || []).length;
  
  // If missing ball, add at valid position
  if (ballCount === 0) {
    const chars = fixedRows[10].split('');
    chars[3] = 'B';
    fixedRows[10] = chars.join('');
  }
  
  // If missing hoop, add at valid position  
  if (hoopCount === 0) {
    const chars = fixedRows[3].split('');
    chars[16] = 'H';
    fixedRows[3] = chars.join('');
  }
  
  // Fix positions if outside valid zones
  fixedRows = fixedRows.map((row, rowIdx) => {
    const chars = row.split('');
    for (let col = 0; col < chars.length; col++) {
      // Fix hoop outside valid zone (cols 14-18, rows 2-6)
      if (chars[col] === 'H') {
        const validCol = col >= 14 && col <= 18;
        const validRow = rowIdx >= 2 && rowIdx <= 6;
        if (!validCol || !validRow) {
          chars[col] = '.';
        }
      }
      // Fix ball outside valid zone (cols 1-5, rows 8-12)
      if (chars[col] === 'B') {
        const validCol = col >= 1 && col <= 5;
        const validRow = rowIdx >= 8 && rowIdx <= 12;
        if (!validCol || !validRow) {
          chars[col] = '.';
        }
      }
    }
    return chars.join('');
  });
  
  // Re-add ball/hoop if removed
  const allTiles2 = fixedRows.join('');
  if (!allTiles2.includes('B')) {
    const chars = fixedRows[10].split('');
    chars[3] = 'B';
    fixedRows[10] = chars.join('');
  }
  if (!allTiles2.includes('H')) {
    const chars = fixedRows[3].split('');
    chars[16] = 'H';
    fixedRows[3] = chars.join('');
  }
  
  // Handle duplicates
  if (ballCount > 1 || hoopCount > 1) {
    let foundBall = false;
    let foundHoop = false;
    fixedRows = fixedRows.map(row => {
      const chars = row.split('');
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === 'B') {
          if (foundBall) chars[i] = '.';
          else foundBall = true;
        }
        if (chars[i] === 'H') {
          if (foundHoop) chars[i] = '.';
          else foundHoop = true;
        }
      }
      return chars.join('');
    });
  }
  
  return fixedRows;
}
