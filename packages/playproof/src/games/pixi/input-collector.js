/**
 * Input Collector
 * High-fidelity input collection for verification telemetry
 * 
 * Attaches DOM listeners directly to canvas to preserve:
 * - event.isTrusted
 * - event.getCoalescedEvents()
 * - performance.now() timestamps
 */

/**
 * Collects and processes input events for behavior analysis
 */
export class InputCollector {
    /**
     * @param {HTMLCanvasElement} canvas - Canvas element to attach listeners to
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.isCollecting = false;
        
        // Behavior data compatible with verification.js
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };

        // Extended telemetry for future SDK
        this.extendedTelemetry = {
            coalescedCount: 0,
            untrustedCount: 0,
            pointerTypes: {},
            dragPaths: []
        };

        // Current drag state
        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
        
        // Last completed drag (for games to detect drag-end)
        this.lastCompletedDrag = null;

        // Bound handlers for cleanup
        this._boundHandlers = {};
    }

    /**
     * Start collecting input
     */
    start() {
        this.reset();
        this.isCollecting = true;
        this._bindEvents();
    }

    /**
     * Stop collecting and finalize data
     */
    stop() {
        this.isCollecting = false;
        this._unbindEvents();
        this._finalize();
        return this.behaviorData;
    }

    /**
     * Reset all collected data
     */
    reset() {
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };
        this.extendedTelemetry = {
            coalescedCount: 0,
            untrustedCount: 0,
            pointerTypes: {},
            dragPaths: []
        };
        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
        this.lastCompletedDrag = null;
    }

    /**
     * Record a hit (successful game action)
     */
    recordHit() {
        this.behaviorData.hits++;
    }

    /**
     * Record a miss (failed game action)
     */
    recordMiss() {
        this.behaviorData.misses++;
    }

    /**
     * Get current drag info (for games to read while dragging)
     */
    getDragInfo() {
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
    consumeCompletedDrag() {
        const drag = this.lastCompletedDrag;
        this.lastCompletedDrag = null;
        return drag;
    }

    /**
     * Bind all event listeners
     */
    _bindEvents() {
        const canvas = this.canvas;

        this._boundHandlers.pointerdown = (e) => this._onPointerDown(e);
        this._boundHandlers.pointermove = (e) => this._onPointerMove(e);
        this._boundHandlers.pointerup = (e) => this._onPointerUp(e);
        this._boundHandlers.pointercancel = (e) => this._onPointerUp(e);

        canvas.addEventListener('pointerdown', this._boundHandlers.pointerdown, { passive: true });
        canvas.addEventListener('pointermove', this._boundHandlers.pointermove, { passive: true });
        canvas.addEventListener('pointerup', this._boundHandlers.pointerup, { passive: true });
        canvas.addEventListener('pointercancel', this._boundHandlers.pointercancel, { passive: true });
    }

    /**
     * Unbind all event listeners
     */
    _unbindEvents() {
        const canvas = this.canvas;
        for (const [event, handler] of Object.entries(this._boundHandlers)) {
            canvas.removeEventListener(event, handler);
        }
        this._boundHandlers = {};
    }

    /**
     * Convert pointer event to canvas-relative coords
     */
    _getCoords(e) {
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
    _processCoalesced(e) {
        const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
        const points = [];

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
    _trackPointerType(e) {
        const type = e.pointerType || 'unknown';
        this.extendedTelemetry.pointerTypes[type] = 
            (this.extendedTelemetry.pointerTypes[type] || 0) + 1;
    }

    /**
     * Handle pointer down
     */
    _onPointerDown(e) {
        if (!this.isCollecting) return;

        this._trackPointerType(e);
        
        const coords = this._getCoords(e);
        this.behaviorData.clickTimings.push(coords.timestamp);
        this.behaviorData.mouseMovements.push({
            x: coords.x,
            y: coords.y,
            timestamp: coords.timestamp
        });

        // Start drag tracking
        this.isDragging = true;
        this.dragStart = coords;
        this.currentDragPath = [coords];

        if (!coords.isTrusted) {
            this.extendedTelemetry.untrustedCount++;
        }
    }

    /**
     * Handle pointer move
     */
    _onPointerMove(e) {
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
    _onPointerUp(e) {
        if (!this.isCollecting) return;

        const coords = this._getCoords(e);
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
            
            // Save as trajectory for verification scoring
            if (this.currentDragPath.length > 2) {
                this.behaviorData.trajectories.push(
                    this.currentDragPath.map(p => ({
                        x: p.x,
                        y: p.y,
                        timestamp: p.timestamp
                    }))
                );
                
                // Save extended drag info
                this.extendedTelemetry.dragPaths.push({
                    start: this.dragStart,
                    end: coords,
                    path: [...this.currentDragPath],
                    duration: coords.timestamp - this.dragStart.timestamp
                });
            }
        }

        this.isDragging = false;
        this.dragStart = null;
        this.currentDragPath = [];
    }

    /**
     * Finalize data after collection ends
     */
    _finalize() {
        // Calculate click accuracy
        const total = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = total > 0 
            ? this.behaviorData.hits / total 
            : 0;
    }

    /**
     * Get full telemetry for future SDK
     */
    getExtendedTelemetry() {
        return {
            ...this.behaviorData,
            extended: this.extendedTelemetry
        };
    }
}

export default InputCollector;
