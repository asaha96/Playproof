/**
 * Playproof SDK - Entry Point
 */

import { Playproof } from './playproof.js';

export { Playproof };
export default Playproof;

// Re-export types for consumers
export type {
  PlayproofConfig,
  PlayproofUserConfig,
  PlayproofTheme,
  PlayproofVerificationResult,
  BehaviorData,
  MovementPoint
} from '@playproof/shared';

// Expose globally for script tag usage
if (typeof window !== 'undefined') {
  window.Playproof = Playproof;
}
