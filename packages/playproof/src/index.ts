/**
 * PlayProof SDK - UMD Bundle Entry
 * Universal module definition for browser usage
 */

import { Playproof } from './playproof';

export { Playproof };
export default Playproof;

// Re-export types and constants for consumers
export type {
  PlayproofTheme,
  PlayproofConfig,
  VerificationResult,
  BehaviorData,
  GameId,
  PlayproofFontFamily,
  SDKHooks,
  PointerTelemetryEvent,
} from './types';

// Re-export session controller types for agent integration
export type { SessionEndResult } from './telemetry/session-controller';

export { PLAYPROOF_FONTS } from './types';

// Export telemetry utilities for advanced consumers
export { PointerTelemetryTracker } from './telemetry/pointer-tracker';
export type { PointerTrackerConfig } from './telemetry/pointer-tracker';

// Expose globally for script tag usage
declare global {
  interface Window {
    Playproof: typeof Playproof;
  }
}

if (typeof window !== 'undefined') {
  window.Playproof = Playproof;
}
