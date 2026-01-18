/**
 * LLM Prompt Pack for Archery GridLevel Generation
 * 
 * 2-stage pipeline:
 * 1. Generate intent (design brief) for the level
 * 2. Generate level based on intent
 */

import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';

/**
 * Intent object - design brief for level generation
 */
export interface ArcheryLevelIntent {
  intent: string;           // 1-sentence design philosophy
  playerHint: string;       // 1-sentence hint for player
  solutionSketch: string[]; // 1-3 sentences describing solution approach
  aestheticNotes: string;   // Visual design notes
  layoutDirective: string;  // Obstacle arrangement guidance
}

/**
 * JSON Schema for ArcheryLevelIntent - used for intent generation
 */
export const ARCHERY_INTENT_JSON_SCHEMA = {
  name: "archery_level_intent",
  strict: true,
  schema: {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "One sentence describing the core design philosophy (e.g., 'Arc through forest gaps')"
      },
      playerHint: {
        type: "string",
        description: "One sentence hint for the player (e.g., 'Aim between the trees')"
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
        description: "Brief visual/layout notes (e.g., 'Forest setting with scattered trees')"
      },
      layoutDirective: {
        type: "string",
        description: "Specific obstacle arrangement guidance (e.g., 'Vertical tree at col 9, rows 5-8')"
      }
    },
    required: ["intent", "playerHint", "solutionSketch", "aestheticNotes", "layoutDirective"],
    additionalProperties: false
  }
} as const;

/**
 * JSON Schema for Archery GridLevel - used for structured outputs
 */
export const ARCHERY_GRID_LEVEL_JSON_SCHEMA = {
  name: "archery_grid_level",
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
        enum: ["archery"],
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
        description: "Empty array for archery (no special entities)"
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

export const ARCHERY_TILE_LEGEND = `
Tile Legend:
- "." = Empty space (arrow flies through)
- "B" = Bow position (exactly one required)
- "T" = Target position (exactly one required)
- "#" = Tree/obstacle (blocks arrow)
`;

export const ARCHERY_PLACEMENT_RULES = `
PLACEMENT RULES:

1. Bow position (B):
   - MUST be in columns 1-4, rows 4-10 (left side)
   - CLEARANCE: All tiles within Chebyshev distance 1 of B MUST be "." or "B" only

2. Target (T):
   - MUST be in columns 15-18, rows 3-11 (right side)
   - CLEARANCE: All tiles within Chebyshev distance 1 of T MUST be "." or "T" only

3. Separation:
   - Bow and target MUST be at least 10 Manhattan tiles apart

4. Obstacles (#):
   - MUST be in the MIDDLE zone only (columns 5-14, rows 1-12)
   - CANNOT be near bow position
   - CANNOT be near target position
   - Maximum 15 obstacle tiles per level
   - Trees are typically vertical (multiple # stacked)

5. Grid Format:
   - EXACTLY 20 columns x 14 rows
   - Row 0 = TOP of screen
   - Row 13 = BOTTOM of screen
`;

export const ARCHERY_NEVER_LIST = `
=== CRITICAL: NEVER DO THESE ===

1. NEVER place obstacles (#) in columns 0-4 or 15-19 (keep bow and target zones clear)
2. NEVER place anything within 1 tile of B (bow needs draw space)
3. NEVER place anything within 1 tile of T (target needs clear rings)
4. NEVER place more than 15 obstacle tiles
5. NEVER make it impossible to arc an arrow over obstacles
6. NEVER place obstacles on grid border (row 0, row 13, col 0, col 19)
`;

export const ARCHERY_CONSTRUCTION_PROCEDURE = `
=== LEVEL CONSTRUCTION PROCEDURE ===

Follow these steps IN ORDER:

STEP 1: Start with a 14x20 grid of all dots
  - Row 0: "...................." (20 dots)
  - All rows: "...................." (20 dots each)
  - Row 13: "...................." (20 dots)

STEP 2: Place Bow (B) on the LEFT side
  - Pick a position: col 2-3, row 5-8 (safe zone)
  - Replace that "." with "B"

STEP 3: Place Target (T) on the RIGHT side  
  - Pick a position: col 16-17, row 5-8 (safe zone)
  - Make sure all 8 neighbors will remain "." (target clearance)
  - Replace that "." with "T"

STEP 4: Add obstacles (trees) - ONLY in middle zone
  - Place in columns 5-14 ONLY
  - Trees are usually vertical: stack # tiles vertically
  - Keep obstacles at least 2 tiles from B
  - Keep obstacles at least 2 tiles from T
  - Consider the arc needed to reach the target

STEP 5: Verify clearances
  - Check 3x3 area around B: must be all "." except B itself
  - Check 3x3 area around T: must be all "." except T itself
  - If violated, remove the offending obstacle

STEP 6: Output the JSON
`;

export function getArcherySystemPrompt(): string {
  return `You are an archery game level designer. Generate valid GridLevel JSON.

=== GRID FORMAT ===
- EXACTLY 20 columns x 14 rows
- "tiles" array: EXACTLY 14 strings, each EXACTLY 20 characters
- This is a SIDE VIEW: Row 0 = top of screen, Row 13 = bottom

${ARCHERY_TILE_LEGEND}

${ARCHERY_NEVER_LIST}

${ARCHERY_PLACEMENT_RULES}

${ARCHERY_CONSTRUCTION_PROCEDURE}

=== PHYSICS CONTEXT ===
The player shoots an arrow from the bow (left) toward a target (right).
The arrow follows a parabolic arc due to gravity.
Trees/obstacles block the arrow's flight path.
The player must arc the arrow to clear obstacles and hit the target.

=== EXAMPLE OUTPUT (medium level with tree obstacle) ===
{
  "schema": "playproof.gridlevel.v1",
  "gameId": "archery",
  "version": 1,
  "seed": "",
  "grid": {
    "cols": 20,
    "rows": 14,
    "tiles": [
      "....................",
      "....................",
      "....................",
      "....................",
      "................T...",
      ".........#..........",
      "..B......#..........",
      ".........#..........",
      "....................",
      "....................",
      "....................",
      "....................",
      "....................",
      "...................."
    ]
  },
  "entities": [],
  "rules": { "difficulty": "medium", "maxShots": 5 },
  "design": {
    "intent": "Arc over a tall tree",
    "playerHint": "Aim high to clear the tree",
    "solutionSketch": ["Lob the arrow over the vertical tree obstacle"],
    "aestheticNotes": "Single tree creates meaningful challenge"
  }
}

Note in the example:
- Bow at (2,6) on left side
- Target at (16,4) on right side
- Vertical tree (3 tiles) at col 9, rows 5-7
- All clearances respected

Output ONLY valid JSON. No markdown, no code blocks, no explanation.`;
}

export function getArcheryGenerationPrompt(difficulty: GridLevelDifficulty, seed?: string): string {
  const seedNote = seed ? `\nTheme inspiration: "${seed}"` : '';
  
  return `Generate a ${difficulty.toUpperCase()} difficulty archery level.${seedNote}

${getArcheryDifficultyRequirements(difficulty)}

REMEMBER:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Bow (B): columns 2-3, rows 5-8 (left side, leave clearance)
- Target (T): columns 16-17, rows 5-8 (right side, leave clearance)
- ALL tiles within 1 step of B must be "."
- ALL tiles within 1 step of T must be "."
- Obstacles ONLY in columns 5-14 (middle zone)

Output ONLY the raw JSON object.`;
}

function getArcheryDifficultyRequirements(difficulty: GridLevelDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return `EASY LEVEL REQUIREMENTS:
- NO obstacles or at most ONE small tree (2-3 tiles)
- Direct shot path should be possible
- Simple and welcoming for new players
- Focus on getting the mechanics right`;
    
    case 'medium':
      return `MEDIUM LEVEL REQUIREMENTS:
- 1-2 tree obstacles (each 2-4 tiles tall)
- Trees in the middle zone requiring arc adjustment
- Player needs to aim higher or find gaps
- Still achievable with a good arc shot`;
    
    case 'hard':
      return `HARD LEVEL REQUIREMENTS:
- 2-3 trees creating a forest obstacle
- May require precise angle selection
- Trees positioned to block obvious shots
- Still must be solvable with correct arc`;
    
    default:
      return '';
  }
}

// ============================================================================
// INTENT GENERATION (Stage 1)
// ============================================================================

const ARCHERY_INTENT_PATTERNS_EASY = [
  'Open field with clear shot to target',
  'Simple introduction with no trees',
  'Single small decorative tree that does not block path',
];

const ARCHERY_INTENT_PATTERNS_MEDIUM = [
  'Single tall tree requiring arc shot',
  'Two trees with gap between them',
  'Mid-height tree to arc over',
  'Staggered trees creating one clear lane',
];

const ARCHERY_INTENT_PATTERNS_HARD = [
  'Dense forest with narrow gap',
  'Multiple trees requiring precise aim',
  'Tall trees forcing maximum arc',
  'Forest gauntlet with threading path',
];

function getArcheryIntentPatterns(difficulty: GridLevelDifficulty): string[] {
  switch (difficulty) {
    case 'easy': return ARCHERY_INTENT_PATTERNS_EASY;
    case 'medium': return ARCHERY_INTENT_PATTERNS_MEDIUM;
    case 'hard': return ARCHERY_INTENT_PATTERNS_HARD;
    default: return ARCHERY_INTENT_PATTERNS_MEDIUM;
  }
}

export function getArcheryIntentSystemPrompt(): string {
  return `You are a creative archery level designer. Your job is to generate a unique design brief (intent) for a level.

The intent describes WHAT the level should feel like and HOW obstacles should be arranged - but you do NOT generate the actual grid yet.

Your output must be a JSON object with these fields:
- intent: One sentence core design philosophy (e.g., "Arc through forest gaps")
- playerHint: One sentence hint for the player (e.g., "Aim between the trees")
- solutionSketch: Array of 1-3 sentences describing how to solve
- aestheticNotes: Brief visual notes (e.g., "Forest setting")
- layoutDirective: Specific obstacle arrangement (e.g., "Vertical tree at col 9, rows 5-8")

CONSTRAINTS TO KEEP IN MIND (for the layoutDirective):
- Bow is always on left (cols 2-3, rows 5-8)
- Target is always on right (cols 16-17, rows 5-8)
- Obstacles (trees) ONLY in middle zone (cols 5-14, rows 1-12)
- Trees are typically vertical stacks of # tiles
- Keep it solvable - there must be a valid arc!

Be creative but practical. The level generator will follow your layoutDirective literally.

Output ONLY valid JSON. No markdown, no code blocks.`;
}

export function getArcheryIntentGenerationPrompt(difficulty: GridLevelDifficulty): string {
  const patterns = getArcheryIntentPatterns(difficulty);
  const examplePatterns = patterns.slice(0, 3).map(p => `  - "${p}"`).join('\n');
  
  return `Generate a UNIQUE and CREATIVE design intent for a ${difficulty.toUpperCase()} difficulty archery level.

${getArcheryDifficultyRequirements(difficulty)}

EXAMPLE PATTERN IDEAS (for inspiration, create something NEW):
${examplePatterns}

Be creative! Generate a fresh, interesting level concept.
The layoutDirective should specify exact obstacle positions.

Example layoutDirective formats:
- "No obstacles, clear shot"
- "Single tree at col 9, rows 5-8 (4 tiles tall)"
- "Two trees: col 7 rows 4-7, col 11 rows 5-9"

Output ONLY the JSON object.`;
}

export function getArcheryGenerationPromptWithIntent(difficulty: GridLevelDifficulty, intent: ArcheryLevelIntent): string {
  return `Generate a ${difficulty.toUpperCase()} difficulty archery level that EXACTLY matches this design intent:

=== DESIGN INTENT (YOU MUST FOLLOW THIS) ===
Intent: ${intent.intent}
Player Hint: ${intent.playerHint}
Solution: ${intent.solutionSketch.join(' ')}
Aesthetics: ${intent.aestheticNotes}
Layout: ${intent.layoutDirective}

${getArcheryDifficultyRequirements(difficulty)}

CRITICAL RULES:
- Tiles array: EXACTLY 14 strings, each EXACTLY 20 characters
- Bow (B): columns 2-3, rows 5-8 (leave clearance)
- Target (T): columns 16-17, rows 5-8 (leave clearance)
- ALL tiles within 1 step of B must be "."
- ALL tiles within 1 step of T must be "."
- Obstacles ONLY in columns 5-14

Follow the layoutDirective above for obstacle placement!

The level's "design" object should contain the exact intent, playerHint, solutionSketch, and aestheticNotes from above.

Output ONLY the raw JSON object.`;
}

export function getArcheryRetryPromptWithIntent(issues: GridLevelIssue[], previousAttempt: string, intent: ArcheryLevelIntent): string {
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
- "bow.zone": Move B to cols 1-4, rows 4-10
- "bow.clearance": Clear 3x3 area around B
- "target.zone": Move T to cols 15-18, rows 3-11  
- "target.clearance": Clear 3x3 area around T
- "obstacle.zone": Keep obstacles in cols 5-14 only

Simplify the obstacles if needed to pass validation, but keep the general layout intent.

Output ONLY the raw JSON object.`;
}

export function parseArcheryIntentFromLLM(response: string): ArcheryLevelIntent | null {
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
      console.log('[parseArcheryIntentFromLLM] Missing required fields:', Object.keys(parsed));
      return null;
    }
    
    // Normalize solutionSketch to array
    if (!Array.isArray(parsed.solutionSketch)) {
      parsed.solutionSketch = parsed.solutionSketch ? [parsed.solutionSketch] : ['Hit the target'];
    }
    
    // Default aestheticNotes if missing
    if (!parsed.aestheticNotes) {
      parsed.aestheticNotes = 'Forest archery range';
    }
    
    return parsed as ArcheryLevelIntent;
  } catch (err) {
    console.log('[parseArcheryIntentFromLLM] Parse error:', err instanceof Error ? err.message : err);
    console.log('[parseArcheryIntentFromLLM] Response preview:', response.slice(0, 500));
    return null;
  }
}

export function parseArcheryGridLevelFromLLM(response: string): GridLevel | null {
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
    const hasGameId = parsed.gameId === 'archery';
    const hasGrid = !!parsed.grid?.tiles;
    const hasTilesArray = Array.isArray(parsed.grid?.tiles);
    
    if (!hasSchema || !hasGameId || !hasGrid || !hasTilesArray) {
      console.log('[parseArcheryGridLevelFromLLM] Validation failed:', {
        hasSchema, hasGameId, hasGrid, hasTilesArray
      });
      return null;
    }
    
    // Fix grid dimensions
    const fixedTiles = fixArcheryGridDimensions(parsed.grid.tiles);
    parsed.grid.tiles = fixedTiles;
    parsed.grid.cols = 20;
    parsed.grid.rows = 14;
    
    // Normalize entities
    if (!Array.isArray(parsed.entities)) {
      parsed.entities = [];
    }
    
    // Normalize rules
    if (!parsed.rules || typeof parsed.rules !== 'object') {
      parsed.rules = { difficulty: 'medium', maxShots: 5 };
    }
    
    // Normalize design
    if (!parsed.design || typeof parsed.design !== 'object') {
      parsed.design = {
        intent: 'Generated archery level',
        playerHint: 'Hit the target',
        solutionSketch: ['Aim carefully and release'],
        aestheticNotes: 'Procedurally generated'
      };
    } else {
      if (!parsed.design.intent) parsed.design.intent = 'Generated level';
      if (!parsed.design.playerHint) parsed.design.playerHint = 'Aim!';
      if (!Array.isArray(parsed.design.solutionSketch)) parsed.design.solutionSketch = ['Hit the target'];
      if (!parsed.design.aestheticNotes) parsed.design.aestheticNotes = 'Procedurally generated';
    }
    
    // Strip seed
    delete parsed.seed;
    
    return parsed as GridLevel;
  } catch (err) {
    console.log('[parseArcheryGridLevelFromLLM] Parse error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Fix grid dimensions for archery levels
 */
function fixArcheryGridDimensions(tiles: string[]): string[] {
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
  
  // Verify we have exactly one B and one T
  const allTiles = fixedRows.join('');
  const bowCount = (allTiles.match(/B/g) || []).length;
  const targetCount = (allTiles.match(/T/g) || []).length;
  
  // If missing bow, add at valid position
  if (bowCount === 0) {
    const chars = fixedRows[6].split('');
    chars[2] = 'B';
    fixedRows[6] = chars.join('');
  }
  
  // If missing target, add at valid position  
  if (targetCount === 0) {
    const chars = fixedRows[6].split('');
    chars[16] = 'T';
    fixedRows[6] = chars.join('');
  }
  
  // Fix positions if outside valid zones
  fixedRows = fixedRows.map((row, rowIdx) => {
    const chars = row.split('');
    for (let col = 0; col < chars.length; col++) {
      // Fix target outside valid zone (cols 15-18, rows 3-11)
      if (chars[col] === 'T') {
        const validCol = col >= 15 && col <= 18;
        const validRow = rowIdx >= 3 && rowIdx <= 11;
        if (!validCol || !validRow) {
          chars[col] = '.';
        }
      }
      // Fix bow outside valid zone (cols 1-4, rows 4-10)
      if (chars[col] === 'B') {
        const validCol = col >= 1 && col <= 4;
        const validRow = rowIdx >= 4 && rowIdx <= 10;
        if (!validCol || !validRow) {
          chars[col] = '.';
        }
      }
    }
    return chars.join('');
  });
  
  // Re-add bow/target if removed
  const allTiles2 = fixedRows.join('');
  if (!allTiles2.includes('B')) {
    const chars = fixedRows[6].split('');
    chars[2] = 'B';
    fixedRows[6] = chars.join('');
  }
  if (!allTiles2.includes('T')) {
    const chars = fixedRows[6].split('');
    chars[16] = 'T';
    fixedRows[6] = chars.join('');
  }
  
  // Handle duplicates
  if (bowCount > 1 || targetCount > 1) {
    let foundBow = false;
    let foundTarget = false;
    fixedRows = fixedRows.map(row => {
      const chars = row.split('');
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === 'B') {
          if (foundBow) chars[i] = '.';
          else foundBow = true;
        }
        if (chars[i] === 'T') {
          if (foundTarget) chars[i] = '.';
          else foundTarget = true;
        }
      }
      return chars.join('');
    });
  }
  
  return fixedRows;
}
