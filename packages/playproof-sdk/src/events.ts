/**
 * PlayProof SDK Event System
 * 
 * Event emitter for lifecycle events and custom handlers.
 * 
 * @packageDocumentation
 */

import type { SDKEventType, SDKEvent, VerificationResult } from './types';

// ============================================================================
// Event Payloads
// ============================================================================

/**
 * Event payload types
 */
export interface EventPayloads {
  init: undefined;
  ready: undefined;
  start: { attemptId: string };
  progress: { progress: number; timeRemaining: number };
  batch: { batchIndex: number; eventCount: number };
  complete: VerificationResult;
  error: Error;
  retry: { attempt: number; maxAttempts: number; delay: number };
  regenerate: { reason: string };
}

/**
 * Event listener function type
 */
export type EventListener<T extends SDKEventType> = (
  event: SDKEvent<EventPayloads[T]>
) => void;

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

// ============================================================================
// Event Emitter
// ============================================================================

/**
 * Simple typed event emitter
 */
export class EventEmitter {
  private listeners: Map<SDKEventType, Set<EventListener<SDKEventType>>> = new Map();

  /**
   * Subscribe to an event
   * @param type - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on<T extends SDKEventType>(type: T, listener: EventListener<T>): Unsubscribe {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    const listeners = this.listeners.get(type)!;
    listeners.add(listener as EventListener<SDKEventType>);

    return () => {
      listeners.delete(listener as EventListener<SDKEventType>);
    };
  }

  /**
   * Subscribe to an event (one-time)
   * @param type - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<T extends SDKEventType>(type: T, listener: EventListener<T>): Unsubscribe {
    const unsubscribe = this.on(type, (event) => {
      unsubscribe();
      listener(event);
    });
    return unsubscribe;
  }

  /**
   * Emit an event
   * @param type - Event type
   * @param data - Event data
   */
  emit<T extends SDKEventType>(type: T, data?: EventPayloads[T]): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;

    const event: SDKEvent<EventPayloads[T]> = {
      type,
      timestamp: Date.now(),
      data,
    };

    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for '${type}':`, error);
      }
    }
  }

  /**
   * Remove all listeners for an event type
   * @param type - Event type (optional, removes all if not provided)
   */
  off(type?: SDKEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for an event type
   */
  listenerCount(type: SDKEventType): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

// ============================================================================
// Global Event Bus
// ============================================================================

/**
 * Global event bus for SDK-wide events
 */
export const globalEventBus = new EventEmitter();

/**
 * Subscribe to SDK events
 */
export function onEvent<T extends SDKEventType>(
  type: T,
  listener: EventListener<T>
): Unsubscribe {
  return globalEventBus.on(type, listener);
}

/**
 * Subscribe to SDK event (one-time)
 */
export function onceEvent<T extends SDKEventType>(
  type: T,
  listener: EventListener<T>
): Unsubscribe {
  return globalEventBus.once(type, listener);
}

/**
 * Emit an SDK event
 */
export function emitEvent<T extends SDKEventType>(
  type: T,
  data?: EventPayloads[T]
): void {
  globalEventBus.emit(type, data);
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Listen for verification completion
 */
export function onComplete(
  listener: (result: VerificationResult) => void
): Unsubscribe {
  return onEvent('complete', (event) => {
    if (event.data) {
      listener(event.data);
    }
  });
}

/**
 * Listen for errors
 */
export function onError(
  listener: (error: Error) => void
): Unsubscribe {
  return onEvent('error', (event) => {
    if (event.data) {
      listener(event.data);
    }
  });
}

/**
 * Listen for progress updates
 */
export function onProgress(
  listener: (progress: number, timeRemaining: number) => void
): Unsubscribe {
  return onEvent('progress', (event) => {
    if (event.data) {
      listener(event.data.progress, event.data.timeRemaining);
    }
  });
}

/**
 * Listen for game start
 */
export function onStart(
  listener: (attemptId: string) => void
): Unsubscribe {
  return onEvent('start', (event) => {
    if (event.data) {
      listener(event.data.attemptId);
    }
  });
}
