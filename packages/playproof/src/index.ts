/**
<<<<<<< HEAD
 * Playproof SDK - Entry Point
 */

import { Playproof } from './playproof.js';
=======
 * PlayProof SDK - UMD Bundle Entry
 * Universal module definition for browser usage
 */

import { Playproof } from './playproof';
>>>>>>> feat/pixi-microgames-v0

export { Playproof };
export default Playproof;

// Re-export types for consumers
export type {
<<<<<<< HEAD
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
=======
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
>>>>>>> feat/pixi-microgames-v0
}
