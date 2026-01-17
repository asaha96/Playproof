/**
 * Base class for all PixiJS verification games
 * Provides common interface for SDK integration
 */

import { PixiHost } from './pixi-host';
import { InputCollector } from './input-collector';
import type { PlayproofConfig, SDKHooks, BehaviorData, AttemptData, GameResult, PlayproofTheme } from '../../types';

// Debug logging (dev-only)
const DEBUG = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    ?.process?.env?.NODE_ENV === 'development';
const log = (...args: unknown[]): void => {
    if (DEBUG) console.log('[GameBase]', ...args);
};

interface GameInstructions {
    title: string;
    description: string;
}

type GameState = 'idle' | 'playing' | 'success' | 'fail';

/**
 * Abstract base class for Pixi games
 * All games must implement: setup(), update(), render(), checkWinCondition()
 */
export abstract class PixiGameBase {
    protected gameArea: HTMLElement;
    protected config: PlayproofConfig;
    protected hooks: SDKHooks;
    protected theme: PlayproofTheme;

    protected host: PixiHost | null;
    protected input: InputCollector | null;
    protected onComplete: ((behaviorData: BehaviorData) => void) | null;

    protected isRunning: boolean;
    protected startTime: number;
    protected elapsedTime: number;

    protected state: GameState;
    protected attemptData: AttemptData | null;

    protected gameName: string;
    protected instructions: GameInstructions;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        this.gameArea = gameArea;
        this.config = config;
        this.hooks = hooks;
        this.theme = config.theme || {};

        this.host = null;
        this.input = null;
        this.onComplete = null;

        this.isRunning = false;
        this.startTime = 0;
        this.elapsedTime = 0;

        this.state = 'idle';
        this.attemptData = null;

        this.gameName = 'base';
        this.instructions = {
            title: 'Game',
            description: 'Complete the challenge'
        };
    }

    /**
     * Initialize the game (called before start)
     */
    async init(): Promise<this> {
        // Create Pixi host
        this.host = new PixiHost(this.gameArea, this.theme);
        await this.host.init();

        // Create input collector attached to canvas
        this.input = new InputCollector(this.host.getCanvas());

        // Let subclass set up the scene
        await this.setup();

        return this;
    }

    /**
     * Start the game
     */
    async start(onComplete: (behaviorData: BehaviorData) => void): Promise<void> {
        log('start() called');
        this.onComplete = onComplete;

        // Initialize if not done
        if (!this.host) {
            log('No host, calling init()');
            await this.init();
        }

        // Reset state
        this.state = 'playing';
        this.isRunning = true;
        this.startTime = performance.now();
        this.elapsedTime = 0;

        // Start input collection
        log('Starting input collection');
        this.input!.start();

        // Start physics/render loop
        log('Starting host update loop');
        this.host!.start(
            (dt: number) => this._update(dt),
            (alpha: number) => this._render(alpha)
        );

        // Set timeout for game duration
        const duration = this.config.gameDuration || 5000;
        log('Game duration:', duration);
        setTimeout(() => {
            if (this.isRunning) {
                this._endGame(false, 'timeout');
            }
        }, duration);
    }

    /**
     * Internal update - wraps subclass update
     */
    private _update(dt: number): void {
        if (!this.isRunning) return;

        this.elapsedTime = performance.now() - this.startTime;

        // Let subclass update
        this.update(dt);

        // Check win/lose conditions
        const result = this.checkWinCondition();
        if (result !== null) {
            this._endGame(result.success, result.reason);
        }
    }

    /**
     * Internal render - wraps subclass render
     */
    private _render(alpha: number): void {
        if (!this.isRunning) return;
        this.render(alpha);
    }

    /**
     * End the game and report results
     */
    private _endGame(success: boolean, reason: string): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.state = success ? 'success' : 'fail';

        // Stop host and input
        this.host!.stop();
        const behaviorData = this.input!.stop();

        // Map game outcome to click accuracy for scoring
        behaviorData.clickAccuracy = this.calculateAccuracy(success, reason);

        // Build attempt data for future SDK
        this.attemptData = {
            game: this.gameName,
            success,
            reason,
            duration: this.elapsedTime,
            timestamp: Date.now(),
            ...this.getAttemptDetails()
        };

        // Trigger hooks
        if (this.hooks.onAttemptEnd) {
            this.hooks.onAttemptEnd(this.attemptData);
        }

        // Show result animation then complete
        this.showResult(success, () => {
            if (this.onComplete) {
                this.onComplete(behaviorData);
            }
        });
    }

    /**
     * Show success/fail result
     */
    protected showResult(success: boolean, callback: () => void): void {
        // Clear and show result
        this.host!.clearLayers();

        const { width, height } = this.host!.getSize();

        // Result circle
        const color = success
            ? (this.theme.success || '#10b981')
            : (this.theme.error || '#ef4444');

        const circle = this.host!.createCircle(width / 2, height / 2 - 20, 30, color);
        circle.alpha = 0.3;
        this.host!.layers.ui.addChild(circle);

        // Result text
        const text = this.host!.createText(
            success ? 'Success!' : 'Try Again',
            { fontSize: 20, fill: color }
        );
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2 + 30;
        this.host!.layers.ui.addChild(text);

        // Wait then callback
        setTimeout(callback, 800);
    }

    /**
     * Calculate accuracy for verification scoring
     * Subclasses should override for game-specific logic
     */
    protected calculateAccuracy(success: boolean, reason: string): number {
        if (success) {
            return 0.85 + Math.random() * 0.07; // 0.85-0.92
        } else if (reason === 'timeout') {
            return 0.3 + Math.random() * 0.2; // 0.3-0.5
        } else {
            return 0.5 + Math.random() * 0.2; // 0.5-0.7
        }
    }

    /**
     * Get additional attempt details for transcript
     * Subclasses should override
     */
    protected getAttemptDetails(): Record<string, unknown> {
        return {};
    }

    // --- Abstract methods for subclasses ---

    /**
     * Set up the game scene
     */
    abstract setup(): Promise<void>;

    /**
     * Update game logic (called at fixed timestep)
     */
    abstract update(dt: number): void;

    /**
     * Render the scene (called each frame)
     */
    abstract render(alpha: number): void;

    /**
     * Check if game is won or lost
     */
    abstract checkWinCondition(): GameResult | null;

    /**
     * Clean up resources
     */
    destroy(): void {
        this.isRunning = false;
        if (this.host) {
            this.host.destroy();
            this.host = null;
        }
        if (this.input) {
            this.input.stop();
            this.input = null;
        }
    }
}

export default PixiGameBase;
