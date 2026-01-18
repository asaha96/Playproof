/**
 * LLM Prompt Pack for Mini-Golf GridLevel Generation
 */

import type { GridLevel, GridLevelDifficulty, GridLevelIssue } from '@playproof/shared';

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

Grid Dimensions: 20 columns x 14 rows (0-indexed, so cols 0-19, rows 0-13)

${TILE_LEGEND}

${PLACEMENT_RULES}

${DESIGN_REQUIREMENTS}

CRITICAL: Output ONLY valid JSON. No markdown, no explanation, just the JSON object.
The JSON must match this TypeScript interface:

interface GridLevel {
  schema: "playproof.gridlevel.v1";
  gameId: "mini-golf";
  version: number;
  seed?: string;
  grid: {
    cols: 20;
    rows: 14;
    tiles: string[]; // Array of 14 strings, each exactly 20 characters
  };
  entities: Array<PortalEntity | MovingBlockEntity>;
  rules?: { difficulty?: "easy" | "medium" | "hard" };
  design: {
    intent: string;
    playerHint: string;
    solutionSketch: string[];
    aestheticNotes: string;
  };
}

interface PortalEntity {
  type: "portal";
  id: string;
  entrance: { tx: number; ty: number };
  exit: { tx: number; ty: number };
  cooldownMs?: number;
  exitVelocityMultiplier?: number;
}

interface MovingBlockEntity {
  type: "movingBlock";
  id: string;
  motion: {
    axis: "x" | "y";
    rangeTiles: number;
    speedTilesPerSec: number;
    mode: "pingpong" | "loop";
    phase?: number;
  };
}`;
}

export function getGenerationPrompt(difficulty: GridLevelDifficulty, seed?: string): string {
  const seedNote = seed ? `\nUse this seed for inspiration: "${seed}"` : '';
  
  return `Generate a ${difficulty} difficulty mini-golf level.${seedNote}

Requirements for ${difficulty}:
${getDifficultyRequirements(difficulty)}

Remember:
- Grid is 20 columns x 14 rows
- Each row in tiles[] must be EXACTLY 20 characters
- Ball spawn zone: columns 1-5, rows 2-11
- Hole zone: columns 14-18, rows 2-11
- Keep it solvable - imagine shooting the ball yourself

Output ONLY the JSON object, nothing else.`;
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

ERRORS (must fix):
${errorList || 'None'}

WARNINGS (should fix if possible):
${warningList || 'None'}

Previous attempt (for reference):
${previousAttempt}

Generate a corrected level. Output ONLY the JSON object, nothing else.`;
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
      return parsed as GridLevel;
    }
    
    return null;
  } catch {
    return null;
  }
}
