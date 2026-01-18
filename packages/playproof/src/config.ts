/**
 * PlayProof SDK Configuration
 * Default values and configuration handling
 */

import type { PlayproofTheme, PlayproofConfig, SDKHooks } from './types';

/**
 * Hardcoded Playproof API URL - end users don't need to configure this
 */
export const PLAYPROOF_API_URL = 'https://calculating-mockingbird-102.convex.cloud';

export const DEFAULT_THEME: PlayproofTheme = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#1e1e2e',
  surface: '#2a2a3e',
  text: '#f5f5f5',
  textMuted: '#a1a1aa',
  accent: '#22d3ee',
  success: '#10b981',
  error: '#ef4444',
  border: '#3f3f5a'
};

export const DEFAULT_HOOKS: SDKHooks = {
  onTelemetryBatch: null,
  onAttemptEnd: null,
  regenerate: null
};

export const DEFAULT_CONFIG: PlayproofConfig = {
  containerId: 'playproof-container',
  theme: DEFAULT_THEME,
  confidenceThreshold: 0.3,
  gameDuration: null, // null = use game default, or specify ms
  gameId: 'bubble-pop', // 'bubble-pop', 'mini-golf', 'basketball', 'archery', or 'random'
  logTelemetry: false, // Set to true to console.log telemetry events (verbose)
  // API credentials for fetching deployment branding
  apiKey: null,
  deploymentId: null,
  onSuccess: null,
  onFailure: null,
  onStart: null,
  onProgress: null,
  hooks: DEFAULT_HOOKS
};

/**
 * Validates and merges user config with defaults
 */
export function mergeConfig(userConfig: Partial<PlayproofConfig> = {}): PlayproofConfig {
  const theme: PlayproofTheme = {
    ...DEFAULT_THEME,
    ...(userConfig.theme || {})
  };

  const hooks: SDKHooks = {
    ...DEFAULT_HOOKS,
    ...(userConfig.hooks || {})
  };

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme,
    hooks
  };
}

/**
 * Validates confidence threshold
 */
export function validateThreshold(threshold: number): boolean {
  return typeof threshold === 'number' && threshold >= 0 && threshold <= 1;
}
