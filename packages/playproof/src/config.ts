/**
 * Playproof SDK Configuration
 * Default values and configuration handling
 */

import type { PlayproofTheme, PlayproofConfig, PlayproofUserConfig } from '@playproof/shared';

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

export const DEFAULT_CONFIG: PlayproofConfig = {
  containerId: 'playproof-container',
  theme: DEFAULT_THEME,
  confidenceThreshold: 0.7,
  gameDuration: 10000, // 10 seconds
  onSuccess: null,
  onFailure: null,
  onStart: null,
  onProgress: null
};

/**
 * Validates and merges user config with defaults
 */
export function mergeConfig(userConfig: PlayproofUserConfig = {}): PlayproofConfig {
  const theme: PlayproofTheme = {
    ...DEFAULT_THEME,
    ...(userConfig.theme || {})
  };

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme
  };
}

/**
 * Validates confidence threshold
 */
export function validateThreshold(threshold: number): boolean {
  return typeof threshold === 'number' && threshold >= 0 && threshold <= 1;
}
