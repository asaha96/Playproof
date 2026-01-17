/**
 * Input Collector
 * 
 * High-fidelity input event capture with DPR mapping and coalesced events.
 * 
 * @packageDocumentation
 */

import type { InputEvent, EventType, CoalescedPoint, Logger } from '../types';
import { RingBuffer } from './RingBuffer';
import { isBrowser } from '../config';

/**
 * Input collector configuration
 */
export interface InputCollectorConfig {
  /** Buffer duration in seconds (default: 5) */
  bufferDuration?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Collects high-fidelity input events from user interactions
 */
export class InputCollector {
  private readonly canvas: HTMLCanvasElement;
  private readonly buffer: RingBuffer;
  private readonly logger?: Logger;
  private isRunning = false;

  // Cached canvas rect for coordinate mapping
  private canvasRect: DOMRect | null = null;
  private dpr = 1;

  // Bound event handlers
  private readonly handlePointerDown: (e: PointerEvent) => void;
  private readonly handlePointerMove: (e: PointerEvent) => void;
  private readonly handlePointerUp: (e: PointerEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleResize: () => void;

  constructor(canvas: HTMLCanvasElement, config: InputCollectorConfig = {}) {
    if (!isBrowser()) {
      throw new Error('InputCollector requires a browser environment');
    }

    this.canvas = canvas;
    this.logger = config.logger;
    
    const bufferDuration = config.bufferDuration ?? 5;
    this.buffer = new RingBuffer({
      maxDurationMs: bufferDuration * 1000,
    });

    // Bind event handlers
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleWheel = this.onWheel.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleResize = this.updateCanvasRect.bind(this);
  }

  /**
   * Start collecting input events
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.updateCanvasRect();
    this.dpr = window.devicePixelRatio || 1;

    // Pointer events
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointerleave', this.handlePointerUp);

    // Wheel events
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: true });

    // Keyboard events (global)
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // Resize handler
    window.addEventListener('resize', this.handleResize);

    this.logger?.debug('InputCollector started');
  }

  /**
   * Stop collecting input events
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointerleave', this.handlePointerUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);

    this.logger?.debug('InputCollector stopped');
  }

  /**
   * Update cached canvas rectangle
   */
  private updateCanvasRect(): void {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  /**
   * Map DOM coordinates to canvas pixel space (DPR-aware)
   */
  private mapToCanvasSpace(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvasRect) {
      this.updateCanvasRect();
    }

    const rect = this.canvasRect!;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    return {
      x: relX * this.dpr,
      y: relY * this.dpr,
    };
  }

  /**
   * Extract coalesced events from a pointer event
   */
  private getCoalescedPoints(event: PointerEvent): CoalescedPoint[] | undefined {
    // Check if getCoalescedEvents is supported
    if (typeof event.getCoalescedEvents !== 'function') {
      return undefined;
    }

    try {
      const coalesced = event.getCoalescedEvents();
      if (coalesced.length <= 1) {
        return undefined;
      }

      return coalesced.map((e) => {
        const pos = this.mapToCanvasSpace(e.clientX, e.clientY);
        return {
          x: pos.x,
          y: pos.y,
          timestamp: e.timeStamp || performance.now(),
          pressure: e.pressure !== 0.5 ? e.pressure : undefined,
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * Create an input event from a pointer event
   */
  private createPointerEvent(event: PointerEvent, type: EventType): InputEvent {
    const pos = this.mapToCanvasSpace(event.clientX, event.clientY);
    const coalesced = type === 'pointermove' ? this.getCoalescedPoints(event) : undefined;

    return {
      type,
      timestamp: performance.now(),
      x: pos.x,
      y: pos.y,
      pressure: event.pressure !== 0.5 ? event.pressure : undefined,
      button: event.button,
      coalesced,
    };
  }

  private onPointerDown(event: PointerEvent): void {
    this.buffer.push(this.createPointerEvent(event, 'pointerdown'));
  }

  private onPointerMove(event: PointerEvent): void {
    this.buffer.push(this.createPointerEvent(event, 'pointermove'));
  }

  private onPointerUp(event: PointerEvent): void {
    this.buffer.push(this.createPointerEvent(event, 'pointerup'));
  }

  private onWheel(event: WheelEvent): void {
    const pos = this.mapToCanvasSpace(event.clientX, event.clientY);

    this.buffer.push({
      type: 'wheel',
      timestamp: performance.now(),
      x: pos.x,
      y: pos.y,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;

    this.buffer.push({
      type: 'keydown',
      timestamp: performance.now(),
      key: event.key,
    });
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.buffer.push({
      type: 'keyup',
      timestamp: performance.now(),
      key: event.key,
    });
  }

  /**
   * Flush all events from buffer
   */
  flush(): InputEvent[] {
    return this.buffer.flush();
  }

  /**
   * Peek at current events without clearing
   */
  peek(): InputEvent[] {
    return this.buffer.peek();
  }

  /**
   * Get buffer statistics
   */
  getStats(): { eventCount: number; timeSpan: number } {
    return {
      eventCount: this.buffer.length,
      timeSpan: this.buffer.timeSpan,
    };
  }

  /**
   * Check if collector is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}
