/**
 * Shared utilities and contracts for PlayProof
 */

export const VERSION = '0.1.0';

/** Verification result types */
export const VerificationResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  REGENERATE: 'REGENERATE',
  STEP_UP: 'STEP_UP',
} as const;

export type VerificationResultValue = typeof VerificationResult[keyof typeof VerificationResult];

// Re-export all types
export * from './types.js';
export * from './gridlevel.js';
export * from './telemetry.js';
export * from './physics.js';
export * from './mini-golf-grid.js';
export * from './mini-golf-levels.js';
