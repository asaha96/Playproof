/**
 * Developer Tools
 * 
 * Debug mode, performance metrics, and mock mode for testing.
 * 
 * @packageDocumentation
 */

import type {
  Logger,
  InputEvent,
  SignedBatch,
  ChallengeResponse,
  AttemptResultResponse,
} from './types';
import { createConsoleLogger } from './config';

// ============================================================================
// Debug Mode
// ============================================================================

/**
 * Debug mode state
 */
let debugEnabled = false;
let debugLogger: Logger = createConsoleLogger();

/**
 * Enable debug mode
 */
export function enableDebug(customLogger?: Logger): void {
  debugEnabled = true;
  if (customLogger) {
    debugLogger = customLogger;
  }
  debugLogger.info('PlayProof debug mode enabled');
}

/**
 * Disable debug mode
 */
export function disableDebug(): void {
  debugEnabled = false;
  debugLogger.info('PlayProof debug mode disabled');
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}

/**
 * Debug log helper
 */
export function debugLog(message: string, ...args: unknown[]): void {
  if (debugEnabled) {
    debugLogger.debug(message, ...args);
  }
}

/**
 * Debug warning helper
 */
export function debugWarn(message: string, ...args: unknown[]): void {
  if (debugEnabled) {
    debugLogger.warn(message, ...args);
  }
}

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * Performance metric entry
 */
export interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
  private entries: PerformanceEntry[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start a performance measurement
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End a performance measurement
   */
  measure(
    name: string,
    startMark: string,
    metadata?: Record<string, unknown>
  ): PerformanceEntry | undefined {
    const startTime = this.marks.get(startMark);
    if (startTime === undefined) {
      debugWarn(`Performance mark '${startMark}' not found`);
      return undefined;
    }

    const duration = performance.now() - startTime;
    const entry: PerformanceEntry = {
      name,
      startTime,
      duration,
      metadata,
    };

    this.entries.push(entry);
    this.marks.delete(startMark);

    if (debugEnabled) {
      debugLog(`⏱ ${name}: ${duration.toFixed(2)}ms`, metadata);
    }

    return entry;
  }

  /**
   * Get all entries
   */
  getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by name
   */
  getEntriesByName(name: string): PerformanceEntry[] {
    return this.entries.filter((e) => e.name === name);
  }

  /**
   * Get summary statistics
   */
  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const groups: Record<string, number[]> = {};

    for (const entry of this.entries) {
      if (!groups[entry.name]) {
        groups[entry.name] = [];
      }
      groups[entry.name].push(entry.duration);
    }

    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    for (const [name, durations] of Object.entries(groups)) {
      summary[name] = {
        count: durations.length,
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      };
    }

    return summary;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.marks.clear();
  }
}

/**
 * Global performance metrics
 */
export const metrics = new PerformanceMetrics();

// ============================================================================
// Development Warnings
// ============================================================================

const warnedOnce = new Set<string>();

/**
 * Show a development warning (once per key)
 */
export function devWarning(key: string, message: string): void {
  if (!debugEnabled) return;
  if (warnedOnce.has(key)) return;

  warnedOnce.add(key);
  debugLogger.warn(`[DEV] ${message}`);
}

/**
 * Clear development warning cache
 */
export function clearWarnings(): void {
  warnedOnce.clear();
}

// ============================================================================
// Mock Mode
// ============================================================================

/**
 * Mock configuration
 */
export interface MockConfig {
  /** Delay before responses (ms) */
  delay?: number;
  /** Force result to pass/fail */
  forceResult?: 'pass' | 'fail';
  /** Custom score */
  customScore?: number;
  /** Simulate network errors */
  simulateErrors?: boolean;
  /** Error rate (0-1) */
  errorRate?: number;
}

/**
 * Mock mode state
 */
let mockMode = false;
let mockConfig: MockConfig = {};

/**
 * Enable mock mode for testing
 */
export function enableMockMode(config: MockConfig = {}): void {
  mockMode = true;
  mockConfig = { delay: 100, ...config };
  debugLog('Mock mode enabled', config);
}

/**
 * Disable mock mode
 */
export function disableMockMode(): void {
  mockMode = false;
  mockConfig = {};
  debugLog('Mock mode disabled');
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode(): boolean {
  return mockMode;
}

/**
 * Get mock config
 */
export function getMockConfig(): MockConfig {
  return { ...mockConfig };
}

/**
 * Create mock challenge response
 */
export async function createMockChallenge(): Promise<ChallengeResponse> {
  await mockDelay();
  maybeThrowMockError('createChallenge');

  return {
    attemptId: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    challengeToken: 'mock-token',
    seed: Math.floor(Math.random() * 1000000),
    rulesetId: 'mock-ruleset',
    ttl: 300,
    ingestUrl: '/v1/batches',
  };
}

/**
 * Create mock batch response
 */
export async function createMockBatchResponse(): Promise<void> {
  await mockDelay();
  maybeThrowMockError('sendBatch');
}

/**
 * Create mock result response
 */
export async function createMockResult(attemptId: string): Promise<AttemptResultResponse> {
  await mockDelay();
  maybeThrowMockError('getResult');

  const score = mockConfig.customScore ?? (0.5 + Math.random() * 0.5);
  const result = mockConfig.forceResult ?? (score >= 0.7 ? 'pass' : 'fail');

  return {
    attemptId,
    result,
    score,
    reason: result === 'pass' ? 'Mock verification passed' : 'Mock verification failed',
  };
}

/**
 * Helper: Mock delay
 */
async function mockDelay(): Promise<void> {
  const delay = mockConfig.delay ?? 100;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Helper: Maybe throw mock error
 */
function maybeThrowMockError(operation: string): void {
  if (!mockConfig.simulateErrors) return;

  const errorRate = mockConfig.errorRate ?? 0.1;
  if (Math.random() < errorRate) {
    throw new Error(`Mock network error in ${operation}`);
  }
}

// ============================================================================
// Event Inspector
// ============================================================================

/**
 * Event inspector for debugging input collection
 */
export class EventInspector {
  private events: InputEvent[] = [];
  private maxEvents = 1000;

  /**
   * Record an event
   */
  record(event: InputEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Get recorded events
   */
  getEvents(): InputEvent[] {
    return [...this.events];
  }

  /**
   * Get event statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgTimeBetweenEvents: number;
  } {
    const byType: Record<string, number> = {};
    let timeDiffs: number[] = [];

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      byType[event.type] = (byType[event.type] ?? 0) + 1;

      if (i > 0) {
        timeDiffs.push(event.timestamp - this.events[i - 1].timestamp);
      }
    }

    const avgTimeBetweenEvents =
      timeDiffs.length > 0
        ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length
        : 0;

    return {
      total: this.events.length,
      byType,
      avgTimeBetweenEvents,
    };
  }

  /**
   * Clear recorded events
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * Global event inspector
 */
export const eventInspector = new EventInspector();

// ============================================================================
// Batch Inspector
// ============================================================================

/**
 * Batch inspector for debugging transport
 */
export class BatchInspector {
  private batches: SignedBatch[] = [];

  /**
   * Record a batch
   */
  record(batch: SignedBatch): void {
    this.batches.push(batch);
    if (debugEnabled) {
      debugLog(
        `Batch ${batch.batch.batchIndex}: ${batch.batch.events.length} events`,
        { hash: batch.hash.slice(0, 16) + '...' }
      );
    }
  }

  /**
   * Get all batches
   */
  getBatches(): SignedBatch[] {
    return [...this.batches];
  }

  /**
   * Get batch summary
   */
  getSummary(): {
    totalBatches: number;
    totalEvents: number;
    avgEventsPerBatch: number;
  } {
    const totalEvents = this.batches.reduce(
      (sum, b) => sum + b.batch.events.length,
      0
    );

    return {
      totalBatches: this.batches.length,
      totalEvents,
      avgEventsPerBatch:
        this.batches.length > 0 ? totalEvents / this.batches.length : 0,
    };
  }

  /**
   * Clear batches
   */
  clear(): void {
    this.batches = [];
  }
}

/**
 * Global batch inspector
 */
export const batchInspector = new BatchInspector();
