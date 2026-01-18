/**
 * Base Game Class for Three.js Games
 * Provides common functionality for all 3D games
 */

import * as THREE from 'three';
import { ThreeEngine, EngineConfig } from './engine';
import { PointerTelemetryTracker } from '../../telemetry/pointer-tracker';
import { HookSink, CompositeSink, LiveKitSink } from '../../telemetry';
import { SessionController, type SessionEndResult } from '../../telemetry/session-controller';
import type { TelemetrySink } from '../../telemetry/sink';
import type { BehaviorData, PlayproofConfig, SDKHooks, BaseGame, PointerTelemetryEvent } from '../../types';

// Default max session duration (safety timeout) when agent is enabled
const DEFAULT_AGENT_MAX_DURATION_MS = 30000;

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

    // Telemetry sink abstraction (supports multiple transports)
    protected telemetrySink: TelemetrySink | null = null;
    protected livekitSink: LiveKitSink | null = null;

    // Session controller for agent-driven session management
    protected sessionController: SessionController | null = null;
    protected agentDecision: SessionEndResult | null = null;
    protected useAgentControl = false; // Whether to use agent-driven session control

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

        // Initialize telemetry sink based on config
        this.telemetrySink = this.createTelemetrySink();

        // Initialize pointer telemetry tracker
        this.pointerTracker = new PointerTelemetryTracker({
            moveThrottleMs: 50,
            logEvents: config.logTelemetry ?? false,
            onBatch: (batch) => this.handleTelemetryBatch(batch),
        });

        this.bindEvents();
    }

    /**
     * Create the telemetry sink based on configuration.
     * If LiveKit is enabled and credentials are present, use a composite sink.
     * Otherwise, fall back to the hook sink only.
     */
    protected createTelemetrySink(): TelemetrySink {
        const sinks: TelemetrySink[] = [];

        // Always add the hook sink (original behavior)
        const hookSink = new HookSink(this.hooks.onTelemetryBatch);
        sinks.push(hookSink);

        // Add LiveKit sink if enabled and credentials are present
        const livekitEnabled = this.config.telemetryTransport?.livekit?.enabled ?? true;
        const hasCredentials = this.config.apiKey && this.config.deploymentId;

        if (livekitEnabled && hasCredentials) {
            this.livekitSink = new LiveKitSink({
                apiKey: this.config.apiKey!,
                deploymentId: this.config.deploymentId!,
                apiBaseUrl: this.config.apiBaseUrl,
                onConnected: (roomName, attemptId) => {
                    console.log('[Playproof] LiveKit connected:', { roomName, attemptId });
                    if (this.sessionController) {
                        this.sessionController.setRoom(this.livekitSink?.getRoom() ?? null);
                    }
                },
                onDisconnected: () => {
                    console.log('[Playproof] LiveKit disconnected');
                },
                onError: (error) => {
                    console.warn('[Playproof] LiveKit error:', error.message);
                },
            });
            sinks.push(this.livekitSink);
        } else if (livekitEnabled && !hasCredentials) {
            // Warn when LiveKit is enabled but credentials are missing
            console.warn(
                '[Playproof] LiveKit telemetry is enabled but apiKey or deploymentId is missing. ' +
                'Falling back to hook-only telemetry. To enable LiveKit, provide both apiKey and deploymentId in the config.'
            );
        }

        // Use composite sink if multiple sinks, otherwise just return the hook sink
        if (sinks.length > 1) {
            return new CompositeSink(sinks);
        }
        return sinks[0];
    }

    protected createEmptyBehaviorData(): BehaviorData {
        return {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0,
            startTime: undefined,
            endTime: undefined,
            durationMs: undefined,
        };
    }

    /**
     * Handle batched telemetry events from the pointer tracker.
     * This is called automatically by the tracker and sends events through the sink.
     */
    protected handleTelemetryBatch(batch: PointerTelemetryEvent[]): void {
        // Store all events for final result
        this.allTelemetryEvents.push(...batch);

        // Determine reliability based on event types
        // Important events (down, up, enter, leave) should be reliable
        const hasImportantEvents = batch.some(e => e.eventType !== 'move');

        // Send through the sink abstraction
        if (this.telemetrySink) {
            this.telemetrySink.sendPointerBatch(batch, hasImportantEvents);
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

        // Connect telemetry sink (async for LiveKit connection)
        if (this.telemetrySink?.connect) {
            try {
                await this.telemetrySink.connect();
            } catch (error) {
                // Log but don't fail - hook sink will still work
                console.warn('[Playproof] Telemetry sink connection failed:', error);
            }
        }
        
        await this.setupGame();
    }

    protected abstract setupGame(): Promise<void>;

    start(onComplete: (data: BehaviorData) => void): void {
        this.onComplete = onComplete;
        this.behaviorData = this.createEmptyBehaviorData();
        this.allTelemetryEvents = []; // Clear previous telemetry
        this.agentDecision = null; // Clear previous agent decision
        this.startTime = Date.now();
        this.behaviorData.startTime = this.startTime; // Store in behavior data
        this.startEngine();

        // Start pointer telemetry tracking
        this.pointerTracker.start();

        // Determine whether to use agent control or fixed timeout
        // Agent control is enabled when:
        // 1. LiveKit is connected (we need the room for control messages)
        // 2. No explicit gameDuration is set (null means agent-controlled)
        const livekitEnabled = this.config.telemetryTransport?.livekit?.enabled ?? true;
        const hasCredentials = Boolean(this.config.apiKey && this.config.deploymentId);
        const hasExplicitDuration = this.config.gameDuration !== null && this.config.gameDuration !== undefined;
        const isLivekitReady = this.livekitSink?.isReady() ?? false;
        this.useAgentControl = livekitEnabled && hasCredentials && !hasExplicitDuration;

        console.log('[Playproof] Session control evaluation', {
            hasLiveKit: Boolean(this.livekitSink),
            isLivekitReady,
            livekitEnabled,
            hasCredentials,
            hasExplicitDuration,
            gameDuration: this.config.gameDuration,
            attemptId: this.livekitSink?.getAttemptId() ?? null,
            roomName: this.livekitSink?.getRoomName() ?? null,
        });

        if (this.useAgentControl) {
            // Use agent-driven session control
            this.sessionController = new SessionController({
                room: this.livekitSink?.getRoom() ?? null,
                maxDuration: DEFAULT_AGENT_MAX_DURATION_MS,
                onSessionEnd: (result) => {
                    this.agentDecision = result;
                    this.endGame();
                },
                onTimeout: () => {
                    console.warn('[Playproof] Agent session timeout - no decision received');
                },
            });
            this.sessionController.start();
            console.log('[Playproof] Using agent-controlled session (max 30s)');
        } else {
            // Fall back to fixed duration timeout
            const duration = this.config.gameDuration || 10000;
            setTimeout(() => this.endGame(), duration);
            console.log(`[Playproof] Using fixed duration session (${duration}ms)`);
        }
    }

    protected endGame(): void {
        this.stop();

        // Stop session controller if active
        if (this.sessionController) {
            this.sessionController.stop();
        }

        // Set end time and calculate duration
        const endTime = Date.now();
        this.behaviorData.endTime = endTime;
        this.behaviorData.durationMs = this.startTime ? endTime - this.startTime : 0;

        // Stop pointer telemetry tracking (flushes remaining events)
        this.pointerTracker.stop();

        // Disconnect telemetry sink
        if (this.telemetrySink?.disconnect) {
            this.telemetrySink.disconnect();
        }

        // Calculate accuracy
        const totalClicks = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = totalClicks > 0
            ? this.behaviorData.hits / totalClicks
            : 0;

        if (this.onComplete) {
            this.onComplete(this.behaviorData);
        }
    }

    /**
     * Get the agent decision (if agent control was used)
     */
    public getAgentDecision(): SessionEndResult | null {
        return this.agentDecision;
    }

    /**
     * Check if the session was agent-controlled
     */
    public wasAgentControlled(): boolean {
        return this.useAgentControl;
    }

    /**
     * Get the current LiveKit attempt ID (if connected)
     */
    public getLivekitAttemptId(): string | null {
        return this.livekitSink?.getAttemptId() ?? null;
    }

    destroy(): void {
        // Clean up session controller
        if (this.sessionController) {
            this.sessionController.stop();
            this.sessionController = null;
        }

        // Clean up pointer telemetry tracker
        this.pointerTracker.destroy();

        // Disconnect telemetry sink
        if (this.telemetrySink?.disconnect) {
            this.telemetrySink.disconnect();
        }

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
