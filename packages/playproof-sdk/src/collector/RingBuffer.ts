// Ring Buffer for storing recent input events
import type { InputEvent } from '../types';

export interface RingBufferConfig {
  maxDurationMs: number; // Maximum time window to retain events
  maxEvents?: number;     // Maximum number of events (fallback)
}

export class RingBuffer {
  private events: InputEvent[] = [];
  private config: Required<RingBufferConfig>;

  constructor(config: RingBufferConfig) {
    this.config = {
      maxDurationMs: config.maxDurationMs,
      maxEvents: config.maxEvents ?? 10000,
    };
  }

  push(event: InputEvent): void {
    this.events.push(event);
    this.prune();
  }

  pushMany(events: InputEvent[]): void {
    this.events.push(...events);
    this.prune();
  }

  private prune(): void {
    const now = performance.now();
    const cutoffTime = now - this.config.maxDurationMs;

    // Remove events older than the time window
    while (this.events.length > 0 && this.events[0].timestamp < cutoffTime) {
      this.events.shift();
    }

    // Also enforce max events limit
    while (this.events.length > this.config.maxEvents) {
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
   * Get the number of events currently stored
   */
  get length(): number {
    return this.events.length;
  }

  /**
   * Get the time span of events in the buffer
   */
  get timeSpan(): number {
    if (this.events.length < 2) return 0;
    return this.events[this.events.length - 1].timestamp - this.events[0].timestamp;
  }

  clear(): void {
    this.events = [];
  }
}
