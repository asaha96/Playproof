/**
 * Base class for all PixiJS verification games
 * Provides common interface for SDK integration
 */

import { PixiHost } from './pixi-host.js';
import { InputCollector } from './input-collector.js';

/**
 * Abstract base class for Pixi games
 * All games must implement: setup(), update(), render(), checkWinCondition()
 */
export class PixiGameBase {
    /**
     * @param {HTMLElement} gameArea - DOM element to mount into
     * @param {Object} config - PlayProof config (includes theme, duration, etc)
     * @param {Object} hooks - SDK hooks for telemetry/events
     */
    constructor(gameArea, config, hooks = {}) {
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
        
        // Game state
        this.state = 'idle'; // idle, playing, success, fail
        this.attemptData = null;
        
        // For subclasses to set
        this.gameName = 'base';
        this.instructions = {
            title: 'Game',
            description: 'Complete the challenge'
        };
    }

    /**
     * Initialize the game (called before start)
     */
    async init() {
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
     * @param {Function} onComplete - Callback with behaviorData when done
     */
    async start(onComplete) {
        this.onComplete = onComplete;
        
        // Initialize if not done
        if (!this.host) {
            await this.init();
        }
        
        // Reset state
        this.state = 'playing';
        this.isRunning = true;
        this.startTime = performance.now();
        this.elapsedTime = 0;
        
        // Start input collection
        this.input.start();
        
        // Start physics/render loop
        this.host.start(
            (dt) => this._update(dt),
            (alpha) => this._render(alpha)
        );
        
        // Set timeout for game duration
        const duration = this.config.gameDuration || 5000;
        setTimeout(() => {
            if (this.isRunning) {
                this._endGame(false, 'timeout');
            }
        }, duration);
    }

    /**
     * Internal update - wraps subclass update
     */
    _update(dt) {
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
    _render(alpha) {
        if (!this.isRunning) return;
        this.render(alpha);
    }

    /**
     * End the game and report results
     */
    _endGame(success, reason) {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.state = success ? 'success' : 'fail';
        
        // Stop host and input
        this.host.stop();
        const behaviorData = this.input.stop();
        
        // Map game outcome to click accuracy for scoring
        // This bridges the Pixi game output to the existing scorer
        behaviorData.clickAccuracy = this.calculateAccuracy(success, reason);
        
        // Build attempt data for future SDK
        this.attemptData = {
            game: this.gameName,
            success,
            reason,
            duration: this.elapsedTime,
            timestamp: Date.now(),
            // Subclasses can add more via getAttemptDetails()
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
    showResult(success, callback) {
        // Clear and show result
        this.host.clearLayers();
        
        const { width, height } = this.host.getSize();
        
        // Result circle
        const color = success 
            ? (this.theme.success || '#10b981')
            : (this.theme.error || '#ef4444');
        
        const circle = this.host.createCircle(width / 2, height / 2 - 20, 30, color);
        circle.alpha = 0.3;
        this.host.layers.ui.addChild(circle);
        
        // Result text
        const text = this.host.createText(
            success ? 'Success!' : 'Try Again',
            { fontSize: 20, fill: color }
        );
        text.anchor.set(0.5);
        text.x = width / 2;
        text.y = height / 2 + 30;
        this.host.layers.ui.addChild(text);
        
        // Wait then callback
        setTimeout(callback, 800);
    }

    /**
     * Calculate accuracy for verification scoring
     * Subclasses should override for game-specific logic
     */
    calculateAccuracy(success, reason) {
        // Default: map success to human-like accuracy range
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
    getAttemptDetails() {
        return {};
    }

    // --- Abstract methods for subclasses ---

    /**
     * Set up the game scene
     */
    async setup() {
        throw new Error('Subclass must implement setup()');
    }

    /**
     * Update game logic (called at fixed timestep)
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        throw new Error('Subclass must implement update()');
    }

    /**
     * Render the scene (called each frame)
     * @param {number} alpha - Interpolation factor
     */
    render(alpha) {
        throw new Error('Subclass must implement render()');
    }

    /**
     * Check if game is won or lost
     * @returns {null | { success: boolean, reason: string }}
     */
    checkWinCondition() {
        throw new Error('Subclass must implement checkWinCondition()');
    }

    /**
     * Clean up resources
     */
    destroy() {
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
