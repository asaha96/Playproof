/**
 * PlayProof SDK Error Classes
 * 
 * Custom error classes for better error handling and debugging.
 * 
 * @packageDocumentation
 */

/**
 * Base error class for all PlayProof SDK errors
 */
export class PlayProofError extends Error {
  /** Error code for programmatic handling */
  readonly code: string;
  /** Whether this error is recoverable */
  readonly recoverable: boolean;
  /** Suggested recovery action */
  readonly suggestion?: string;
  /** Original error that caused this error */
  readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'PlayProofError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.suggestion = options?.suggestion;
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to a user-friendly message
   */
  toUserMessage(): string {
    if (this.suggestion) {
      return `${this.message}. ${this.suggestion}`;
    }
    return this.message;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      suggestion: this.suggestion,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Network-related errors (API calls, connectivity)
 */
export class NetworkError extends PlayProofError {
  /** HTTP status code (if applicable) */
  readonly statusCode?: number;
  /** Response body (if applicable) */
  readonly responseBody?: unknown;

  constructor(
    message: string,
    options?: {
      statusCode?: number;
      responseBody?: unknown;
      cause?: Error;
    }
  ) {
    super(message, 'NETWORK_ERROR', {
      recoverable: true,
      suggestion: 'Check your network connection and try again.',
      cause: options?.cause,
    });
    this.name = 'NetworkError';
    this.statusCode = options?.statusCode;
    this.responseBody = options?.responseBody;
  }
}

/**
 * Configuration validation errors
 */
export class ConfigurationError extends PlayProofError {
  /** Invalid configuration field */
  readonly field?: string;
  /** Expected value or format */
  readonly expected?: string;
  /** Received value */
  readonly received?: unknown;

  constructor(
    message: string,
    options?: {
      field?: string;
      expected?: string;
      received?: unknown;
    }
  ) {
    const suggestion = options?.field
      ? `Check the '${options.field}' configuration option.`
      : 'Review your SDK configuration.';

    super(message, 'CONFIG_ERROR', {
      recoverable: false,
      suggestion,
    });
    this.name = 'ConfigurationError';
    this.field = options?.field;
    this.expected = options?.expected;
    this.received = options?.received;
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends PlayProofError {
  /** Operation that timed out */
  readonly operation: string;
  /** Timeout duration in milliseconds */
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      {
        recoverable: true,
        suggestion: 'The operation took too long. Please try again.',
      }
    );
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Validation errors for input data
 */
export class ValidationError extends PlayProofError {
  /** Validation errors by field */
  readonly errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', {
      recoverable: false,
      suggestion: 'Check the input data and fix any validation errors.',
    });
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Hash chain integrity errors
 */
export class IntegrityError extends PlayProofError {
  /** Expected hash */
  readonly expectedHash?: string;
  /** Received hash */
  readonly receivedHash?: string;

  constructor(
    message: string,
    options?: {
      expectedHash?: string;
      receivedHash?: string;
    }
  ) {
    super(message, 'INTEGRITY_ERROR', {
      recoverable: false,
      suggestion: 'Data integrity check failed. This may indicate tampering.',
    });
    this.name = 'IntegrityError';
    this.expectedHash = options?.expectedHash;
    this.receivedHash = options?.receivedHash;
  }
}

/**
 * State-related errors (wrong lifecycle state)
 */
export class StateError extends PlayProofError {
  /** Current state */
  readonly currentState: string;
  /** Expected state(s) */
  readonly expectedState: string | string[];

  constructor(
    message: string,
    currentState: string,
    expectedState: string | string[]
  ) {
    const expected = Array.isArray(expectedState)
      ? expectedState.join(' or ')
      : expectedState;

    super(message, 'STATE_ERROR', {
      recoverable: false,
      suggestion: `Operation requires state '${expected}' but current state is '${currentState}'.`,
    });
    this.name = 'StateError';
    this.currentState = currentState;
    this.expectedState = expectedState;
  }
}

/**
 * Browser compatibility errors
 */
export class CompatibilityError extends PlayProofError {
  /** Missing feature */
  readonly feature: string;
  /** Browser information */
  readonly browser?: string;

  constructor(feature: string, browser?: string) {
    super(
      `Required feature '${feature}' is not supported${browser ? ` in ${browser}` : ''}`,
      'COMPAT_ERROR',
      {
        recoverable: false,
        suggestion: 'Please use a modern browser that supports this feature.',
      }
    );
    this.name = 'CompatibilityError';
    this.feature = feature;
    this.browser = browser;
  }
}

/**
 * Challenge-related errors
 */
export class ChallengeError extends PlayProofError {
  /** Challenge/attempt ID */
  readonly attemptId?: string;

  constructor(
    message: string,
    attemptId?: string,
    options?: { cause?: Error }
  ) {
    super(message, 'CHALLENGE_ERROR', {
      recoverable: true,
      suggestion: 'There was an issue with the verification challenge. Please try again.',
      cause: options?.cause,
    });
    this.name = 'ChallengeError';
    this.attemptId = attemptId;
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is a PlayProof error
 */
export function isPlayProofError(error: unknown): error is PlayProofError {
  return error instanceof PlayProofError;
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (isPlayProofError(error)) {
    return error.recoverable;
  }
  return false;
}

/**
 * Wrap an unknown error in a PlayProofError
 */
export function wrapError(error: unknown, context?: string): PlayProofError {
  if (isPlayProofError(error)) {
    return error;
  }

  const message = error instanceof Error
    ? error.message
    : String(error);

  const fullMessage = context
    ? `${context}: ${message}`
    : message;

  return new PlayProofError(fullMessage, 'UNKNOWN_ERROR', {
    recoverable: false,
    cause: error instanceof Error ? error : undefined,
  });
}

/**
 * Create a NetworkError from a fetch Response
 */
export async function networkErrorFromResponse(
  response: Response,
  context?: string
): Promise<NetworkError> {
  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    try {
      responseBody = await response.text();
    } catch {
      responseBody = undefined;
    }
  }

  const message = context
    ? `${context}: HTTP ${response.status} ${response.statusText}`
    : `HTTP ${response.status} ${response.statusText}`;

  return new NetworkError(message, {
    statusCode: response.status,
    responseBody,
  });
}
