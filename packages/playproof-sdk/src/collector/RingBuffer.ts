/**
 * Ring Buffer for Input Events
 * 
 * Time-windowed storage for recent input events.
 * 
 * @packageDocumentation
 */

import type { InputEvent } from '../types';

/**
 * Ring buffer configuration
 */
export interface RingBufferConfig {
  /** Maximum time window to retain events (ms) */
  maxDurationMs: number;
  /** Maximum number of events (fallback limit) */
  maxEvents?: number;
}

/**
 * Ring buffer for storing recent input events
 */
export class RingBuffer {
  private events: InputEvent[] = [];
  private readonly maxDurationMs: number;
  private readonly maxEvents: number;

  constructor(config: RingBufferConfig) {
    this.maxDurationMs = config.maxDurationMs;
    this.maxEvents = config.maxEvents ?? 10000;
  }

  /**
   * Push a single event
   */
  push(event: InputEvent): void {
    this.events.push(event);
    this.prune();
  }

  /**
   * Push multiple events
   */
  pushMany(events: InputEvent[]): void {
    this.events.push(...events);
    this.prune();
  }

  /**
   * Remove old events outside the time window
   */
  private prune(): void {
    const now = performance.now();
    const cutoffTime = now - this.maxDurationMs;

    // Remove events older than the time window
    while (this.events.length > 0 && this.events[0].timestamp < cutoffTime) {
      this.events.shift();
    }

    // Enforce max events limit
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Get all events and clear the buffer
   */
  flush(): InputEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }

  /**
   * Get all events without clearing
   */
  peek(): InputEvent[] {
    return [...this.events];
  }

  /**
   * Get events within a time range
   */
  getRange(startTime: number, endTime: number): InputEvent[] {
    return this.events.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Get current event count
   */
  get length(): number {
    return this.events.length;
  }

  /**
   * Get time span of events in buffer
   */
  get timeSpan(): number {
    if (this.events.length < 2) return 0;
    return this.events[this.events.length - 1].timestamp - this.events[0].timestamp;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}
