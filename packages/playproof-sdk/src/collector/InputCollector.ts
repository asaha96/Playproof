// Input Collector - High-fidelity event capture with DPR mapping and coalesced events
import type { InputEvent, EventType } from '../types';
import { RingBuffer } from './RingBuffer';

export interface InputCollectorConfig {
  bufferDuration?: number; // seconds, default 5
}

interface CoalescedPoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

export class InputCollector {
  private canvas: HTMLCanvasElement;
  private buffer: RingBuffer;
  private config: Required<InputCollectorConfig>;
  private isRunning = false;

  // Cached canvas rect for coordinate mapping
  private canvasRect: DOMRect | null = null;
  private dpr: number = 1;

  // Bound event handlers
  private handlePointerDown: (e: PointerEvent) => void;
  private handlePointerMove: (e: PointerEvent) => void;
  private handlePointerUp: (e: PointerEvent) => void;
  private handleWheel: (e: WheelEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleResize: () => void;

  constructor(canvas: HTMLCanvasElement, config: InputCollectorConfig = {}) {
    this.canvas = canvas;
    this.config = {
      bufferDuration: config.bufferDuration ?? 5,
    };

    this.buffer = new RingBuffer({
      maxDurationMs: this.config.bufferDuration * 1000,
    });

    // Bind handlers
    this.handlePointerDown = this.onPointerDown.bind(this);
    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerUp = this.onPointerUp.bind(this);
    this.handleWheel = this.onWheel.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    this.handleResize = this.updateCanvasRect.bind(this);
  }

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

    // Keyboard events (on document for global capture)
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);

    // Resize handling
    window.addEventListener('resize', this.handleResize);
  }

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
  }

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
    
    // Calculate position relative to canvas element
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Scale by DPR to get actual canvas pixel coordinates
    return {
      x: relX * this.dpr,
      y: relY * this.dpr,
    };
  }

  /**
   * Extract coalesced events from a pointer event (high-frequency capture)
   */
  private getCoalescedPoints(event: PointerEvent): CoalescedPoint[] | undefined {
    // Check if getCoalescedEvents is supported
    if (typeof event.getCoalescedEvents !== 'function') {
      return undefined;
    }

    const coalesced = event.getCoalescedEvents();
    if (coalesced.length <= 1) {
      return undefined; // No additional coalesced events
    }

    return coalesced.map((e) => {
      const pos = this.mapToCanvasSpace(e.clientX, e.clientY);
      return {
        x: pos.x,
        y: pos.y,
        timestamp: e.timeStamp || performance.now(),
        pressure: e.pressure !== 0.5 ? e.pressure : undefined, // 0.5 is default
      };
    });
  }

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
    // Only capture non-repeating key events
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
   * Flush all events from the buffer
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
   * Get buffer stats
   */
  getStats(): { eventCount: number; timeSpan: number } {
    return {
      eventCount: this.buffer.length,
      timeSpan: this.buffer.timeSpan,
    };
  }
}
