/**
 * Playproof SDK Configuration
 * Default values and configuration handling
 */

export const DEFAULT_THEME = {
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

export const DEFAULT_CONFIG = {
  containerId: 'playproof-container',
  theme: DEFAULT_THEME,
  confidenceThreshold: 0.7,
  gameDuration: null, // null = use game default, or specify ms
  gameId: 'bubble-pop', // 'bubble-pop', 'mini-golf', 'basketball', 'archery', or 'random'
  onSuccess: null,
  onFailure: null,
  onStart: null,
  onProgress: null,
  // Future SDK hooks (unused in v0)
  hooks: {
    onTelemetryBatch: null,
    onAttemptEnd: null,
    regenerate: null
  }
};

/**
 * Validates and merges user config with defaults
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Merged configuration
 */
export function mergeConfig(userConfig = {}) {
  const theme = {
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
 * @param {number} threshold - Threshold value to validate
 * @returns {boolean} Whether threshold is valid
 */
export function validateThreshold(threshold) {
  return typeof threshold === 'number' && threshold >= 0 && threshold <= 1;
}
