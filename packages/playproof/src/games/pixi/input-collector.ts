/**
 * Input Collector
 * High-fidelity input collection for verification telemetry
 *
 * Attaches DOM listeners directly to canvas to preserve:
 * - event.isTrusted
 * - event.getCoalescedEvents()
 * - performance.now() timestamps
 */

import type {
    BehaviorData,
    ExtendedTelemetry,
    PointerCoords,
    DragInfo,
    CompletedDrag,
    DragPath
} from '../../types';

// Enable verbose logging in development
const DEBUG = true;
const log = (...args: unknown[]): void => {
    if (DEBUG) console.log('[InputCollector]', ...args);
};

/**
 * Collects and processes input events for behavior analysis
 */
export class InputCollector {
    private canvas: HTMLCanvasElement;
    public isCollecting: boolean;
    private behaviorData: BehaviorData;
    private extendedTelemetry: ExtendedTelemetry;
    
    public isDragging: boolean;
    private dragStart: PointerCoords | null;
    private currentDragPath: PointerCoords[];
    private lastCompletedDrag: CompletedDrag | null;
    private _boundHandlers: Record<string, (e: PointerEvent) => void>;
    private _windowHandlers: Record<string, (e: PointerEvent) => void>;
    private activePointerId: number | null;
    private hasPointerCapture: boolean;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.isCollecting = false;

        this.behaviorData = this._createEmptyBehaviorData();
        this.extendedTelemetry = this._createEmptyTelemetry();

        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
        this.lastCompletedDrag = null;
        this._boundHandlers = {};
        this._windowHandlers = {};
        this.activePointerId = null;
        this.hasPointerCapture = false;
    }

    private _createEmptyBehaviorData(): BehaviorData {
        return {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };
    }

    private _createEmptyTelemetry(): ExtendedTelemetry {
        return {
            coalescedCount: 0,
            untrustedCount: 0,
            pointerTypes: {},
            dragPaths: []
        };
    }

    /**
     * Start collecting input
     */
    start(): void {
        log('start() called');
        this.reset();
        this.isCollecting = true;
        this._bindEvents();
        log('Events bound, isCollecting =', this.isCollecting);
    }

    /**
     * Stop collecting and finalize data
     */
    stop(): BehaviorData {
        this.isCollecting = false;
        this._unbindEvents();
        this._finalize();
        return this.behaviorData;
    }

    /**
     * Reset all collected data
     */
    reset(): void {
        this.behaviorData = this._createEmptyBehaviorData();
        this.extendedTelemetry = this._createEmptyTelemetry();
        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
        this.lastCompletedDrag = null;
        this.activePointerId = null;
        this.hasPointerCapture = false;
    }

    /**
     * Record a hit (successful game action)
     */
    recordHit(): void {
        this.behaviorData.hits++;
    }

    /**
     * Record a miss (failed game action)
     */
    recordMiss(): void {
        this.behaviorData.misses++;
    }

    /**
     * Get current drag info (for games to read while dragging)
     */
    getDragInfo(): DragInfo | null {
        if (!this.isDragging || !this.dragStart) return null;

        const last = this.currentDragPath[this.currentDragPath.length - 1];
        if (!last) return null;

        return {
            startX: this.dragStart.x,
            startY: this.dragStart.y,
            currentX: last.x,
            currentY: last.y,
            dx: last.x - this.dragStart.x,
            dy: last.y - this.dragStart.y,
            duration: last.timestamp - this.dragStart.timestamp,
            path: this.currentDragPath
        };
    }

    /**
     * Get the last completed drag (call once per frame, auto-clears)
     * Returns null if no drag was completed since last call
     */
    consumeCompletedDrag(): CompletedDrag | null {
        const drag = this.lastCompletedDrag;
        if (drag) {
            log('consumeCompletedDrag() returning:', drag);
        }
        this.lastCompletedDrag = null;
        return drag;
    }

    /**
     * Bind all event listeners
     */
    private _bindEvents(): void {
        const canvas = this.canvas;

        this._boundHandlers.pointerdown = (e: PointerEvent) => {
            if (!this.activePointerId) {
                this._onPointerDown(e);
            } else {
                log('pointerdown ignored: active pointer in progress');
            }
        };
        this._boundHandlers.pointermove = (e: PointerEvent) => {
            if (!this.activePointerId || e.pointerId === this.activePointerId) {
                this._onPointerMove(e);
            }
        };
        this._boundHandlers.pointerleave = (e: PointerEvent) => {
            if (this.activePointerId && e.pointerId === this.activePointerId) {
                log('pointerleave detected for active pointer, treating as pointerup');
                this._onPointerUp(e);
            }
        };
        this._boundHandlers.pointerup = (e: PointerEvent) => {
            if (!this.activePointerId || e.pointerId === this.activePointerId) {
                this._onPointerUp(e);
            }
        };
        this._boundHandlers.pointercancel = (e: PointerEvent) => {
            if (!this.activePointerId || e.pointerId === this.activePointerId) {
                this._onPointerUp(e);
            }
        };
 
        canvas.addEventListener('pointerdown', this._boundHandlers.pointerdown, { passive: true });
        canvas.addEventListener('pointermove', this._boundHandlers.pointermove, { passive: true });
        canvas.addEventListener('pointerup', this._boundHandlers.pointerup, { passive: true });
        canvas.addEventListener('pointercancel', this._boundHandlers.pointercancel, { passive: true });
        canvas.addEventListener('pointerleave', this._boundHandlers.pointerleave, { passive: true });
 
        this._windowHandlers.pointerup = (e: PointerEvent) => {
            if (this.activePointerId && e.pointerId === this.activePointerId) {
                log('window pointerup detected for active pointer, proxying to _onPointerUp');
                this._onPointerUp(e);
            }
        };
        this._windowHandlers.pointercancel = (e: PointerEvent) => {
            if (this.activePointerId && e.pointerId === this.activePointerId) {
                log('window pointercancel detected for active pointer, proxying to _onPointerUp');
                this._onPointerUp(e);
            }
        };
        this._windowHandlers.pointerleave = (e: PointerEvent) => {
            if (this.activePointerId && e.pointerId === this.activePointerId) {
                log('window pointerleave detected for active pointer, proxying to _onPointerUp');
                this._onPointerUp(e);
            }
        };
 
        window.addEventListener('pointerup', this._windowHandlers.pointerup as EventListener, { passive: true });
        window.addEventListener('pointercancel', this._windowHandlers.pointercancel as EventListener, { passive: true });
        window.addEventListener('pointerleave', this._windowHandlers.pointerleave as EventListener, { passive: true });

    }

    /**
     * Unbind all event listeners
     */
    private _unbindEvents(): void {
        const canvas = this.canvas;
        for (const [event, handler] of Object.entries(this._boundHandlers)) {
            canvas.removeEventListener(event, handler as EventListener);
        }
        for (const [event, handler] of Object.entries(this._windowHandlers)) {
            window.removeEventListener(event, handler as EventListener);
        }
        this._boundHandlers = {};
        this._windowHandlers = {};
        this._resetActivePointer();
    }

    /**
     * Convert pointer event to canvas-relative coords
     */
    private _getCoords(e: PointerEvent): PointerCoords {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            timestamp: performance.now(),
            isTrusted: e.isTrusted
        };
    }

    /**
     * Process coalesced events if available
     */
    private _processCoalesced(e: PointerEvent): PointerCoords[] {
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        const points: PointerCoords[] = [];

        for (const ce of events) {
            const coords = this._getCoords(ce);
            points.push(coords);
            this.behaviorData.mouseMovements.push({
                x: coords.x,
                y: coords.y,
                timestamp: coords.timestamp
            });

            if (!coords.isTrusted) {
                this.extendedTelemetry.untrustedCount++;
            }
        }

        if (events.length > 1) {
            this.extendedTelemetry.coalescedCount += events.length - 1;
        }

        return points;
    }

    /**
     * Track pointer type for analysis
     */
    private _trackPointerType(e: PointerEvent): void {
        const type = e.pointerType || 'unknown';
        this.extendedTelemetry.pointerTypes[type] =
            (this.extendedTelemetry.pointerTypes[type] || 0) + 1;
    }

    /**
     * Handle pointer down
     */
    private _onPointerDown(e: PointerEvent): void {
        log('pointerdown', { isCollecting: this.isCollecting, clientX: e.clientX, clientY: e.clientY });
        if (!this.isCollecting) return;

        this._trackPointerType(e);

        const coords = this._getCoords(e);
        log('pointerdown coords:', coords);
        this.behaviorData.clickTimings.push(coords.timestamp);
        this.behaviorData.mouseMovements.push({
            x: coords.x,
            y: coords.y,
            timestamp: coords.timestamp
        });

        // Capture pointer to ensure we get pointerup even if released outside canvas
        try {
            this.canvas.setPointerCapture(e.pointerId);
            log('Pointer captured:', e.pointerId);
        } catch (err) {
            log('setPointerCapture failed:', err);
        }

        // Start drag tracking
        this.isDragging = true;
        this.dragStart = coords;
        this.currentDragPath = [coords];
        this.activePointerId = e.pointerId;
        this.hasPointerCapture = true;
        log('Drag started, isDragging =', this.isDragging, 'activePointerId =', this.activePointerId);

        if (!coords.isTrusted) {
            this.extendedTelemetry.untrustedCount++;
        }
    }

    /**
     * Handle pointer move
     */
    private _onPointerMove(e: PointerEvent): void {
        if (!this.isCollecting) return;

        const points = this._processCoalesced(e);

        // Add to current drag path if dragging
        if (this.isDragging) {
            this.currentDragPath.push(...points);
        }
    }

    /**
     * Handle pointer up
     */
    private _onPointerUp(e: PointerEvent): void {
        log('pointerup', { isCollecting: this.isCollecting, isDragging: this.isDragging, clientX: e.clientX, clientY: e.clientY });

        // Release pointer capture
        if (this.hasPointerCapture) {
            try {
                this.canvas.releasePointerCapture(e.pointerId);
                log('Pointer released:', e.pointerId);
            } catch (err) {
                log('releasePointerCapture failed:', err);
            }
            this.hasPointerCapture = false;
        }

        if (!this.isCollecting) return;

        const coords = this._getCoords(e);
        log('pointerup coords:', coords);
        this.behaviorData.clickTimings.push(coords.timestamp);
        this.behaviorData.mouseMovements.push({
            x: coords.x,
            y: coords.y,
            timestamp: coords.timestamp
        });

        // Complete drag tracking
        if (this.isDragging && this.dragStart) {
            this.currentDragPath.push(coords);

            // Store completed drag for game to consume
            this.lastCompletedDrag = {
                startX: this.dragStart.x,
                startY: this.dragStart.y,
                endX: coords.x,
                endY: coords.y,
                dx: coords.x - this.dragStart.x,
                dy: coords.y - this.dragStart.y,
                duration: coords.timestamp - this.dragStart.timestamp,
                path: [...this.currentDragPath]
            };
            log('Drag completed! lastCompletedDrag:', this.lastCompletedDrag);

            this._storeTrajectory(coords);
        } else {
            log('pointerup but not dragging or no dragStart');
        }

        this._resetActivePointer();
    }

    private _storeTrajectory(coords: PointerCoords): void {
        if (!this.dragStart) return;

        if (this.currentDragPath.length > 2) {
            this.behaviorData.trajectories.push(
                this.currentDragPath.map(p => ({
                    x: p.x,
                    y: p.y,
                    timestamp: p.timestamp
                }))
            );

            const dragPath: DragPath = {
                start: this.dragStart,
                end: coords,
                path: [...this.currentDragPath],
                duration: coords.timestamp - this.dragStart.timestamp
            };
            this.extendedTelemetry.dragPaths.push(dragPath);
        }

        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
    }

    private _resetActivePointer(): void {
        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
        this.activePointerId = null;
        this.hasPointerCapture = false;
    }

    /**
     * Finalize data after collection ends
     */
    private _finalize(): void {
        // Calculate click accuracy
        const total = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = total > 0
            ? this.behaviorData.hits / total
            : 0;
    }

    /**
     * Get full telemetry for future SDK
     */
    getExtendedTelemetry(): BehaviorData & { extended: ExtendedTelemetry } {
        return {
            ...this.behaviorData,
            extended: this.extendedTelemetry
        };
    }
}

export default InputCollector;
