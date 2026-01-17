/**
 * PlayProof SDK
 * Game-based captcha verification for better human/bot segmentation
 */

import { mergeConfig, validateThreshold } from './config';
import { calculateConfidence, createVerificationResult } from './verification';
import { createGame, getGameInfo, getGameInstructions, getRandomGameId } from './games/registry';
import { UIManager } from './ui';
import type { PlayproofConfig, BehaviorData, VerificationResult, SDKHooks, BaseGame } from './types';

export class Playproof {
    private config: PlayproofConfig;
    private uiManager: UIManager | null;
    private gameArea: HTMLElement | null;
    private game: BaseGame | null;
    private progressInterval: ReturnType<typeof setInterval> | null;
    private currentGameId: string;

    constructor(config: Partial<PlayproofConfig> = {}) {
        this.config = mergeConfig(config);
        this.uiManager = null;
        this.gameArea = null;
        this.game = null;
        this.progressInterval = null;
        this.currentGameId = '';

        if (!validateThreshold(this.config.confidenceThreshold)) {
            console.warn('Playproof: Invalid confidenceThreshold, using default 0.7');
            this.config.confidenceThreshold = 0.7;
        }
    }

    /**
     * Create the captcha UI
     */
    private createUI(): boolean {
        // Initialize UI Manager with theme
        this.uiManager = new UIManager(this.config.theme);

        // Get game instructions for display
        let gameId: string = this.config.gameId || 'bubble-pop';
        if (gameId === 'random') {
            gameId = getRandomGameId();
            this.config.gameId = gameId as PlayproofConfig['gameId'];
        }

        const instructions = getGameInstructions(gameId);
        const gameInfo = getGameInfo(gameId);
        const duration = this.config.gameDuration || gameInfo.duration || 10000;
        const durationSec = Math.ceil(duration / 1000);

        // Create container via UI Manager
        const result = this.uiManager.createContainer(
            this.config.containerId,
            instructions.title,
            instructions.description,
            durationSec,
            () => this.startGame()
        );

        if (!result) {
            return false;
        }

        this.gameArea = result.gameArea;
        return true;
    }

    /**
     * Start the verification game
     */
    async startGame(): Promise<void> {
        if (this.config.onStart) {
            this.config.onStart();
        }

        // Clear instructions
        this.uiManager?.clearInstructions();

        // Determine which game to play
        let gameId: string = this.config.gameId || 'bubble-pop';
        if (gameId === 'random') {
            gameId = getRandomGameId();
        }
        this.currentGameId = gameId;

        // Get game info for duration
        const gameInfo = getGameInfo(gameId);
        const duration = this.config.gameDuration || gameInfo.duration || 10000;

        // Create SDK hooks for future use
        const hooks: SDKHooks = {
            onTelemetryBatch: this.config.hooks?.onTelemetryBatch || null,
            onAttemptEnd: this.config.hooks?.onAttemptEnd || null,
            regenerate: this.config.hooks?.regenerate || null
        };

        // Initialize game via registry
        this.game = createGame(gameId, this.gameArea!, {
            ...this.config,
            gameDuration: duration
        }, hooks);

        // For Pixi games, we need to await init
        if (gameInfo.isPixi && this.game.init) {
            await this.game.init();
        }

        // Start progress animation
        const startTime = Date.now();

        this.progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

            this.uiManager?.updateProgress(progress, remaining);

            if (this.config.onProgress) {
                this.config.onProgress(progress);
            }
        }, 100);

        // Start game
        this.game.start((behaviorData: BehaviorData) => {
            if (this.progressInterval) {
                clearInterval(this.progressInterval);
            }
            this.evaluateResult(behaviorData);
        });
    }

    /**
     * Evaluate game results
     */
    private evaluateResult(behaviorData: BehaviorData): void {
        const score = calculateConfidence(behaviorData);
        const result = createVerificationResult(
            score,
            this.config.confidenceThreshold,
            behaviorData
        );

        this.showResult(result);

        if (result.passed) {
            if (this.config.onSuccess) {
                this.config.onSuccess(result);
            }
        } else {
            if (this.config.onFailure) {
                this.config.onFailure(result);
            }
        }
    }

    /**
     * Show verification result
     */
    private showResult(result: VerificationResult): void {
        this.uiManager?.showResult(result);
    }

    /**
     * Initialize and render the captcha
     */
    verify(): Promise<VerificationResult> {
        return new Promise((resolve, reject) => {
            const originalOnSuccess = this.config.onSuccess;
            const originalOnFailure = this.config.onFailure;

            this.config.onSuccess = (result: VerificationResult) => {
                if (originalOnSuccess) originalOnSuccess(result);
                resolve(result);
            };

            this.config.onFailure = (result: VerificationResult) => {
                if (originalOnFailure) originalOnFailure(result);
                resolve(result); // Still resolve, but with passed: false
            };

            if (!this.createUI()) {
                reject(new Error('Failed to create UI'));
            }
        });
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.game) {
            this.game.destroy();
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        if (this.uiManager) {
            this.uiManager.destroy();
            this.uiManager = null;
        }
    }
}

// Export for different module systems
export default Playproof;
