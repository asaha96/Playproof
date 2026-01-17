// Type definitions (JSDoc for now, migrate to TypeScript later)

/**
 * @typedef {Object} VerificationEvent
 * @property {string} type - Event type (mousemove, click, etc.)
 * @property {number} timestamp - Event timestamp
 * @property {Object} data - Event-specific data
 */

/**
 * @typedef {Object} ScoringRequest
 * @property {string} sessionId - Session identifier
 * @property {VerificationEvent[]} events - Array of verification events
 */

/**
 * @typedef {Object} ScoringResponse
 * @property {'PASS' | 'FAIL' | 'REGENERATE' | 'STEP_UP'} result - Verification result
 * @property {number} confidence - Confidence score (0-1)
 * @property {Object} [details] - Optional detailed metrics
 */

export {};
