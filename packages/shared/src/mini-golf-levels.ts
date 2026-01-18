/**
 * Curated GridLevel archetypes for mini-golf
 */

import type { GridLevel } from './gridlevel.js';

export const MINI_GOLF_LEVELS: GridLevel[] = [
  {
    schema: 'playproof.gridlevel.v1',
    gameId: 'mini-golf',
    version: 1,
    seed: 'straight-shot-01',
    grid: {
      cols: 20,
      rows: 14,
      tiles: [
        '....................',
        '....................',
        '....................',
        '...B................',
        '....................',
        '....................',
        '....................',
        '................H...',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................'
      ]
    },
    entities: [],
    rules: { difficulty: 'easy' },
    design: {
      intent: 'Simple direct shot for beginners.',
      playerHint: 'Aim straight at the hole.',
      solutionSketch: ['Direct shot with medium power.'],
      aestheticNotes: 'Open field, no obstacles.'
    }
  },
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
    seed: 'water-hazard-01',
    grid: {
      cols: 20,
      rows: 14,
      tiles: [
        '....................',
        '....................',
        '..B.................',
        '....................',
        '....................',
        '.........~~.........',
        '.........~~.....H...',
        '.........~~.........',
        '.........##.........',
        '.........##.........',
        '....................',
        '....................',
        '....................',
        '....................'
      ]
    },
    entities: [],
    rules: { difficulty: 'hard' },
    design: {
      intent: 'Navigate around water hazard and wall.',
      playerHint: 'Avoid the water, bank off the wall.',
      solutionSketch: ['Medium power, angle to avoid water.'],
      aestheticNotes: 'Water and wall form distinct obstacles.'
    }
  }
];
