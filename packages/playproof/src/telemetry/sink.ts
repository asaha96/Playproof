/**
 * TelemetrySink Abstraction
 * 
 * Internal abstraction for sending telemetry events to different destinations.
 * This allows the SDK to support multiple transport mechanisms:
 * - HookSink: Calls the existing hooks.onTelemetryBatch callback
 * - LiveKitSink: Publishes to LiveKit for real-time streaming
 * - CompositeSink: Combines multiple sinks
 */

import type { PointerTelemetryEvent } from '../types';

/**
 * Base interface for telemetry sinks
 */
export interface TelemetrySink {
  /**
   * Send a batch of pointer telemetry events
   */
  sendPointerBatch(batch: PointerTelemetryEvent[], reliable?: boolean): void;

  /**
   * Connect the sink (called when verification starts)
   */
  connect?(): Promise<void>;

  /**
   * Disconnect the sink (called when verification ends)
   */
  disconnect?(): void;

  /**
   * Check if the sink is connected and ready
   */
  isReady(): boolean;
}

/**
 * HookSink - Sends telemetry to the existing hooks.onTelemetryBatch callback
 * This is the original telemetry transport mechanism.
 */
export class HookSink implements TelemetrySink {
  private callback: ((batch: PointerTelemetryEvent[]) => void) | null;

  constructor(callback: ((batch: PointerTelemetryEvent[]) => void) | null) {
    this.callback = callback;
  }

  sendPointerBatch(batch: PointerTelemetryEvent[]): void {
    if (this.callback) {
      try {
        this.callback(batch);
      } catch (error) {
        console.error('[HookSink] Error in onTelemetryBatch callback:', error);
      }
    }
  }

  isReady(): boolean {
    return this.callback !== null;
  }
}

/**
 * CompositeSink - Sends telemetry to multiple sinks
 */
export class CompositeSink implements TelemetrySink {
  private sinks: TelemetrySink[];

  constructor(sinks: TelemetrySink[]) {
    this.sinks = sinks;
  }

  async connect(): Promise<void> {
    await Promise.all(
      this.sinks.map(sink => sink.connect?.())
    );
  }

  disconnect(): void {
    this.sinks.forEach(sink => sink.disconnect?.());
  }

  sendPointerBatch(batch: PointerTelemetryEvent[], reliable?: boolean): void {
    this.sinks.forEach(sink => {
      try {
        sink.sendPointerBatch(batch, reliable);
      } catch (error) {
        console.error('[CompositeSink] Error in sink:', error);
      }
    });
  }

  isReady(): boolean {
    // Ready if at least one sink is ready
    return this.sinks.some(sink => sink.isReady());
  }
}
