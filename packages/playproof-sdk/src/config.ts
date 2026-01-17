/**
 * PlayProof SDK Configuration
 * 
 * Configuration validation and default values.
 * 
 * @packageDocumentation
 */

import type {
  PlayProofConfig,
  PlayProofConfigRequired,
  PlayProofTheme,
  Logger,
} from './types';
import { ConfigurationError, ValidationError } from './errors';

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default theme colors
 */
export const DEFAULT_THEME: Required<PlayProofTheme> = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#1e1e2e',
  surface: '#2a2a3e',
  text: '#f5f5f5',
  textMuted: '#a1a1aa',
  accent: '#22d3ee',
  success: '#10b981',
  error: '#ef4444',
  border: '#3f3f5a',
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<PlayProofConfigRequired, 'apiUrl'> = {
  gameDuration: 3000,
  batchInterval: 500,
  bufferDuration: 5,
  confidenceThreshold: 0.7,
  theme: DEFAULT_THEME,
  debug: false,
  logger: createConsoleLogger(),
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a hex color string
 */
function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validate a URL string
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate theme configuration
 */
function validateTheme(theme: PlayProofTheme): Record<string, string> {
  const errors: Record<string, string> = {};

  const colorFields: (keyof PlayProofTheme)[] = [
    'primary',
    'secondary',
    'background',
    'surface',
    'text',
    'textMuted',
    'accent',
    'success',
    'error',
    'border',
  ];

  for (const field of colorFields) {
    const value = theme[field];
    if (value !== undefined && !isValidHexColor(value)) {
      errors[`theme.${field}`] = `Invalid hex color: ${value}. Use format #RGB or #RRGGBB.`;
    }
  }

  return errors;
}

/**
 * Validate SDK configuration
 * @throws {ValidationError} if configuration is invalid
 */
export function validateConfig(config: PlayProofConfig): void {
  const errors: Record<string, string> = {};

  // Required fields
  if (!config.apiUrl) {
    errors.apiUrl = 'apiUrl is required';
  } else if (!isValidUrl(config.apiUrl)) {
    errors.apiUrl = 'apiUrl must be a valid URL';
  }

  // Numeric fields
  if (config.gameDuration !== undefined) {
    if (typeof config.gameDuration !== 'number' || config.gameDuration < 1000) {
      errors.gameDuration = 'gameDuration must be a number >= 1000 (ms)';
    }
    if (config.gameDuration > 30000) {
      errors.gameDuration = 'gameDuration must be <= 30000 (30 seconds)';
    }
  }

  if (config.batchInterval !== undefined) {
    if (typeof config.batchInterval !== 'number' || config.batchInterval < 100) {
      errors.batchInterval = 'batchInterval must be a number >= 100 (ms)';
    }
  }

  if (config.bufferDuration !== undefined) {
    if (typeof config.bufferDuration !== 'number' || config.bufferDuration < 1) {
      errors.bufferDuration = 'bufferDuration must be a number >= 1 (seconds)';
    }
  }

  if (config.confidenceThreshold !== undefined) {
    if (
      typeof config.confidenceThreshold !== 'number' ||
      config.confidenceThreshold < 0 ||
      config.confidenceThreshold > 1
    ) {
      errors.confidenceThreshold = 'confidenceThreshold must be a number between 0 and 1';
    }
  }

  // Theme validation
  if (config.theme) {
    Object.assign(errors, validateTheme(config.theme));
  }

  // Throw if there are errors
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Invalid SDK configuration', errors);
  }
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(config: PlayProofConfig): PlayProofConfigRequired {
  validateConfig(config);

  return {
    apiUrl: config.apiUrl,
    gameDuration: config.gameDuration ?? DEFAULT_CONFIG.gameDuration,
    batchInterval: config.batchInterval ?? DEFAULT_CONFIG.batchInterval,
    bufferDuration: config.bufferDuration ?? DEFAULT_CONFIG.bufferDuration,
    confidenceThreshold: config.confidenceThreshold ?? DEFAULT_CONFIG.confidenceThreshold,
    theme: {
      ...DEFAULT_THEME,
      ...config.theme,
    },
    debug: config.debug ?? DEFAULT_CONFIG.debug,
    logger: config.logger ?? DEFAULT_CONFIG.logger,
  };
}

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * Create a console logger
 */
export function createConsoleLogger(): Logger {
  const prefix = '[PlayProof]';

  return {
    debug: (message: string, ...args: unknown[]) => {
      console.debug(`${prefix} ${message}`, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`${prefix} ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`${prefix} ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`${prefix} ${message}`, ...args);
    },
  };
}

/**
 * Create a silent logger (no-op)
 */
export function createSilentLogger(): Logger {
  const noop = () => {};
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
}

/**
 * Create a debug-aware logger
 * Only logs debug messages when debug mode is enabled
 */
export function createDebugLogger(debug: boolean): Logger {
  const baseLogger = createConsoleLogger();

  return {
    debug: debug ? baseLogger.debug : () => {},
    info: baseLogger.info,
    warn: baseLogger.warn,
    error: baseLogger.error,
  };
}

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if running in Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && 
    process.versions != null && 
    process.versions.node != null;
}

/**
 * Check if running in a Web Worker
 */
export function isWebWorker(): boolean {
  return typeof self !== 'undefined' && 
    typeof (self as unknown as { WorkerGlobalScope?: unknown }).WorkerGlobalScope !== 'undefined';
}

/**
 * Get the current environment
 */
export function getEnvironment(): 'browser' | 'node' | 'worker' | 'unknown' {
  if (isBrowser()) return 'browser';
  if (isWebWorker()) return 'worker';
  if (isNode()) return 'node';
  return 'unknown';
}

/**
 * Ensure we're in a browser environment
 * @throws {ConfigurationError} if not in browser
 */
export function ensureBrowser(): void {
  if (!isBrowser()) {
    throw new ConfigurationError(
      'PlayProof SDK requires a browser environment',
      { field: 'environment', expected: 'browser', received: getEnvironment() }
    );
  }
}
