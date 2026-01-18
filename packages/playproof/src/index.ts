/**
 * PlayProof SDK - UMD Bundle Entry
 * Universal module definition for browser usage
 */

import { Playproof } from './playproof';

export { Playproof };
export default Playproof;

// Re-export types for consumers
export type {
  PlayproofTheme,
  PlayproofConfig,
  VerificationResult,
  BehaviorData,
  GameId
} from './types';

// Expose globally for script tag usage
declare global {
  interface Window {
    Playproof: typeof Playproof;
  }
}

if (typeof window !== 'undefined') {
  window.Playproof = Playproof;
}
