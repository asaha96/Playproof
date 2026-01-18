/**
 * PointerTelemetryTracker
 * 
 * A game-agnostic class that captures pointer events (mouse, touch, pen) from any HTML element.
 * Designed to work on top of any game or interactive canvas without interfering with game logic.
 * 
 * Features:
 * - Captures move, down, up, enter, leave events
 * - Tracks isDown state across events
 * - Throttles move events (configurable, default 50ms)
 * - Immediately flushes important events (down, up, enter, leave)
 * - Optional console logging for debugging
 * - Stores all raw events for later analysis
 */

import type { PointerTelemetryEvent } from '../types';

export interface PointerTrackerConfig {
    /** Throttle interval for move events in ms (default: 50) */
    moveThrottleMs?: number;
    /** Whether to log events to console (default: false) */
    logEvents?: boolean;
    /** Callback for batched events */
    onBatch?: (events: PointerTelemetryEvent[]) => void;
}

export class PointerTelemetryTracker {
    private element: HTMLElement | null = null;
    private config: Required<PointerTrackerConfig>;
    private events: PointerTelemetryEvent[] = [];
    private buffer: PointerTelemetryEvent[] = [];
    private isDown = false;
    private startTime = 0;
    private lastMoveFlush = 0;
    private isTracking = false;

    // Bound event handlers (for proper removal)
    private boundPointerMove: (e: PointerEvent) => void;
    private boundPointerDown: (e: PointerEvent) => void;
    private boundPointerUp: (e: PointerEvent) => void;
    private boundPointerEnter: (e: PointerEvent) => void;
    private boundPointerLeave: (e: PointerEvent) => void;

    constructor(config: PointerTrackerConfig = {}) {
        this.config = {
            moveThrottleMs: config.moveThrottleMs ?? 50,
            logEvents: config.logEvents ?? false,
            onBatch: config.onBatch ?? (() => {}),
        };

        // Bind handlers
        this.boundPointerMove = this.handlePointerEvent.bind(this, 'move');
        this.boundPointerDown = this.handlePointerEvent.bind(this, 'down');
        this.boundPointerUp = this.handlePointerEvent.bind(this, 'up');
        this.boundPointerEnter = this.handlePointerEvent.bind(this, 'enter');
        this.boundPointerLeave = this.handlePointerEvent.bind(this, 'leave');
    }

    /**
     * Attach to an element and start tracking
     */
    attach(element: HTMLElement): void {
        if (this.element) {
            this.detach();
        }

        this.element = element;
        this.startTime = performance.now();
        this.events = [];
        this.buffer = [];
        this.isDown = false;
        this.lastMoveFlush = 0;

        // Add listeners with passive: false for touch support
        element.addEventListener('pointermove', this.boundPointerMove, { passive: true });
        element.addEventListener('pointerdown', this.boundPointerDown, { passive: true });
        element.addEventListener('pointerup', this.boundPointerUp, { passive: true });
        element.addEventListener('pointerenter', this.boundPointerEnter, { passive: true });
        element.addEventListener('pointerleave', this.boundPointerLeave, { passive: true });

        // Prevent context menu on long press for mobile
        element.addEventListener('contextmenu', this.preventContextMenu);
    }

    /**
     * Detach from element and stop tracking
     */
    detach(): void {
        if (!this.element) return;

        this.element.removeEventListener('pointermove', this.boundPointerMove);
        this.element.removeEventListener('pointerdown', this.boundPointerDown);
        this.element.removeEventListener('pointerup', this.boundPointerUp);
        this.element.removeEventListener('pointerenter', this.boundPointerEnter);
        this.element.removeEventListener('pointerleave', this.boundPointerLeave);
        this.element.removeEventListener('contextmenu', this.preventContextMenu);

        this.element = null;
    }

    /**
     * Start tracking (call after attach)
     */
    start(): void {
        this.isTracking = true;
        this.startTime = performance.now();
        this.events = [];
        this.buffer = [];
        this.isDown = false;
        this.lastMoveFlush = 0;
    }

    /**
     * Stop tracking (keeps data, just stops recording)
     */
    stop(): void {
        this.isTracking = false;
        // Flush any remaining buffered events
        this.flush();
    }

    /**
     * Get all captured events
     */
    getEvents(): PointerTelemetryEvent[] {
        return [...this.events];
    }

    /**
     * Clear all captured events
     */
    clear(): void {
        this.events = [];
        this.buffer = [];
    }

    /**
     * Manually flush the buffer
     */
    flush(): void {
        if (this.buffer.length > 0) {
            this.events.push(...this.buffer);
            this.config.onBatch(this.buffer);
            this.buffer = [];
        }
    }

    /**
     * Full cleanup - detach and clear
     */
    destroy(): void {
        this.stop();
        this.detach();
        this.clear();
    }

    /**
     * Update configuration at runtime
     */
    setConfig(config: Partial<PointerTrackerConfig>): void {
        if (config.moveThrottleMs !== undefined) {
            this.config.moveThrottleMs = config.moveThrottleMs;
        }
        if (config.logEvents !== undefined) {
            this.config.logEvents = config.logEvents;
        }
        if (config.onBatch !== undefined) {
            this.config.onBatch = config.onBatch;
        }
    }

    private preventContextMenu = (e: Event): void => {
        e.preventDefault();
    };

    private handlePointerEvent(
        eventType: PointerTelemetryEvent['eventType'],
        e: PointerEvent
    ): void {
        if (!this.isTracking || !this.element) return;

        // Update isDown state
        if (eventType === 'down') {
            this.isDown = true;
        } else if (eventType === 'up' || eventType === 'leave') {
            this.isDown = false;
        }

        const rect = this.element.getBoundingClientRect();
        const now = performance.now();

        const event: PointerTelemetryEvent = {
            timestampMs: Date.now(),
            tMs: Math.round((now - this.startTime) * 100) / 100,
            x: Math.round((e.clientX - rect.left) * 100) / 100,
            y: Math.round((e.clientY - rect.top) * 100) / 100,
            clientX: e.clientX,
            clientY: e.clientY,
            isDown: this.isDown,
            eventType,
            pointerType: e.pointerType,
            pointerId: e.pointerId,
            isTrusted: e.isTrusted,
        };

        // Add to buffer
        this.buffer.push(event);

        // Log if enabled
        if (this.config.logEvents) {
            console.log('[PointerTelemetry]', eventType, {
                t: event.tMs.toFixed(2) + 'ms',
                x: event.x,
                y: event.y,
                isDown: event.isDown,
                pointerType: event.pointerType,
            });
        }

        // Flush strategy:
        // - Important events (down, up, enter, leave): flush immediately
        // - Move events: throttle to reduce noise
        const isImportantEvent = eventType !== 'move';

        if (isImportantEvent || now - this.lastMoveFlush > this.config.moveThrottleMs) {
            this.lastMoveFlush = now;
            this.flush();
        }
    }
}

export default PointerTelemetryTracker;
