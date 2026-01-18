/**
 * Curated GridLevel archetypes for mini-golf
 */

import type { GridLevel } from './gridlevel.js';

export const MINI_GOLF_LEVELS: GridLevel[] = [
  {
    schema: 'playproof.gridlevel.v1',
    gameId: 'mini-golf',
    version: 1,
    seed: 'bank-shot-01',
    grid: {
      cols: 20,
      rows: 14,
      tiles: [
        '....................',
        '....................',
        '..B.................',
        '....................',
        '....................',
        '.........##.........',
        '.........##.....H...',
        '.........##.........',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................'
      ]
    },
    entities: [],
    rules: { difficulty: 'medium' },
    design: {
      intent: 'Single bank shot around a central block.',
      playerHint: 'Bank off the obstacle toward the hole.',
      solutionSketch: ['Medium power, slight up-right angle.'],
      aestheticNotes: 'Clean rectangles, no noisy single tiles.'
    }
  },
  {
    schema: 'playproof.gridlevel.v1',
    gameId: 'mini-golf',
    version: 1,
    seed: 'sand-drift-01',
    grid: {
      cols: 20,
      rows: 14,
      tiles: [
        '....................',
        '....................',
        '..B......SS.........',
        '..SS.....SS.........',
        '..SS.....SS.........',
        '.........##.........',
        '.........##.....H...',
        '.........##.........',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................'
      ]
    },
    entities: [],
    rules: { difficulty: 'medium' },
    design: {
      intent: 'Shot through sand patch with gentle slowdown.',
      playerHint: 'Expect the sand to reduce speed.',
      solutionSketch: ['Firm power, stay centered through sand.'],
      aestheticNotes: 'Sand forms compact rectangles.'
    }
  }
];
