/**
 * Base Game Class for Three.js Games
 * Provides common functionality for all 3D games
 */

import * as THREE from 'three';
import { ThreeEngine, EngineConfig } from './engine';
import { PointerTelemetryTracker } from '../../telemetry/pointer-tracker';
import type { BehaviorData, PlayproofConfig, SDKHooks, BaseGame, PointerTelemetryEvent } from '../../types';

export interface MouseMovement {
    x: number;
    y: number;
    timestamp: number;
}

export abstract class ThreeBaseGame extends ThreeEngine implements BaseGame {
    protected config: PlayproofConfig;
    protected hooks: SDKHooks;
    protected behaviorData: BehaviorData;
    protected currentTrajectory: MouseMovement[];
    protected startTime: number | null = null;
    protected onComplete: ((data: BehaviorData) => void) | null = null;
    protected raycaster: THREE.Raycaster;
    protected mouse: THREE.Vector2;
    protected gameObjects: THREE.Object3D[] = [];

    // Pointer telemetry tracking (works on top of any game)
    protected pointerTracker: PointerTelemetryTracker;
    protected allTelemetryEvents: PointerTelemetryEvent[] = [];

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        const engineConfig: EngineConfig = {
            container: gameArea,
            backgroundColor: 0x1a1a2e,
        };
        super(engineConfig);

        this.config = config;
        this.hooks = hooks;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentTrajectory = [];
        this.behaviorData = this.createEmptyBehaviorData();

        // Initialize pointer telemetry tracker
        this.pointerTracker = new PointerTelemetryTracker({
            moveThrottleMs: 50,
            logEvents: config.logTelemetry ?? false,
            onBatch: (batch) => this.handleTelemetryBatch(batch),
        });

        this.bindEvents();
    }

    protected createEmptyBehaviorData(): BehaviorData {
        return {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0,
        };
    }

    /**
     * Handle batched telemetry events from the pointer tracker.
     * This is called automatically by the tracker and fires the SDK hook.
     */
    protected handleTelemetryBatch(batch: PointerTelemetryEvent[]): void {
        // Store all events for final result
        this.allTelemetryEvents.push(...batch);

        // Fire the hook so consumers can receive telemetry in real-time
        if (this.hooks.onTelemetryBatch) {
            this.hooks.onTelemetryBatch(batch);
        }
    }

    /**
     * Get all captured telemetry events (for inclusion in verification result)
     */
    public getTelemetryEvents(): PointerTelemetryEvent[] {
        return [...this.allTelemetryEvents];
    }

    protected bindEvents(): void {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('click', this.handleClick);
        canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    protected handleMouseMove = (event: MouseEvent): void => {
        if (!this.isRunning) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.mouse.x = (x / rect.width) * 2 - 1;
        this.mouse.y = -(y / rect.height) * 2 + 1;

        const movement: MouseMovement = { x, y, timestamp: Date.now() };
        this.behaviorData.mouseMovements.push(movement);
        this.currentTrajectory.push(movement);

        this.onMouseMove(x, y);
    };

    protected handleClick = (event: MouseEvent): void => {
        if (!this.isRunning) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.behaviorData.clickTimings.push(Date.now());

        // Save trajectory
        if (this.currentTrajectory.length > 2) {
            this.behaviorData.trajectories.push([...this.currentTrajectory]);
        }
        this.currentTrajectory = [];

        this.onClick(x, y);
    };

    protected handleTouchStart = (event: TouchEvent): void => {
        event.preventDefault();
        if (!this.isRunning || event.touches.length === 0) return;
        this.onTouchStart(event.touches[0]);
    };

    protected handleTouchMove = (event: TouchEvent): void => {
        event.preventDefault();
        if (!this.isRunning || event.touches.length === 0) return;

        const touch = event.touches[0];
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const movement: MouseMovement = { x, y, timestamp: Date.now() };
        this.behaviorData.mouseMovements.push(movement);
        this.currentTrajectory.push(movement);

        this.onTouchMove(touch);
    };

    protected handleTouchEnd = (event: TouchEvent): void => {
        event.preventDefault();
        if (!this.isRunning) return;

        if (this.currentTrajectory.length > 2) {
            this.behaviorData.trajectories.push([...this.currentTrajectory]);
        }
        this.currentTrajectory = [];

        this.onTouchEnd(event.changedTouches[0]);
    };

    // Override these in subclasses
    protected onMouseMove(_x: number, _y: number): void { }
    protected onClick(_x: number, _y: number): void { }
    protected onTouchStart(_touch: Touch): void { }
    protected onTouchMove(_touch: Touch): void { }
    protected onTouchEnd(_touch: Touch): void { }

    async init(): Promise<void> {
        this.mount();
        
        // Attach pointer telemetry tracker to the canvas
        // This works on top of any game - completely game-agnostic
        this.pointerTracker.attach(this.renderer.domElement);
        
        await this.setupGame();
    }

    protected abstract setupGame(): Promise<void>;

    start(onComplete: (data: BehaviorData) => void): void {
        this.onComplete = onComplete;
        this.behaviorData = this.createEmptyBehaviorData();
        this.allTelemetryEvents = []; // Clear previous telemetry
        this.startTime = Date.now();
        this.startEngine();

        // Start pointer telemetry tracking
        this.pointerTracker.start();

        // End after duration
        const duration = this.config.gameDuration || 10000;
        setTimeout(() => this.endGame(), duration);
    }

    protected endGame(): void {
        this.stop();

        // Stop pointer telemetry tracking (flushes remaining events)
        this.pointerTracker.stop();

        // Calculate accuracy
        const totalClicks = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = totalClicks > 0
            ? this.behaviorData.hits / totalClicks
            : 0;

        if (this.onComplete) {
            this.onComplete(this.behaviorData);
        }
    }

    destroy(): void {
        // Clean up pointer telemetry tracker
        this.pointerTracker.destroy();

        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousemove', this.handleMouseMove);
        canvas.removeEventListener('click', this.handleClick);
        canvas.removeEventListener('touchstart', this.handleTouchStart);
        canvas.removeEventListener('touchmove', this.handleTouchMove);
        canvas.removeEventListener('touchend', this.handleTouchEnd);

        this.gameObjects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.gameObjects = [];

        super.destroy();
    }

    protected raycast(objects: THREE.Object3D[]): THREE.Intersection[] {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true);
    }
}

export default ThreeBaseGame;
