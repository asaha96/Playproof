/**
 * PlayProof Client
 * 
 * Main SDK client for programmatic usage.
 * 
 * @packageDocumentation
 */

import type {
  PlayProofConfig,
  PlayProofConfigRequired,
  ChallengeResponse,
  AttemptResultResponse,
  VerificationResult,
  EventBatch,
  SignedBatch,
  LifecycleState,
  Logger,
} from './types';
import { mergeConfig, ensureBrowser } from './config';
import {
  StateError,
  ChallengeError,
  wrapError,
} from './errors';
import { InputCollector } from './collector/InputCollector';
import { HashChain } from './transport/HashChain';
import { HttpTransport } from './transport/HttpTransport';
import { EventEmitter, type EventPayloads } from './events';
import { checkRequiredFeatures } from './compat';
import {
  debugLog,
  metrics,
  isMockMode,
  createMockChallenge,
  createMockBatchResponse,
  createMockResult,
  batchInspector,
} from './devtools';

/**
 * PlayProof SDK Client
 */
export class PlayProofClient {
  private readonly config: PlayProofConfigRequired;
  private readonly transport: HttpTransport;
  private readonly hashChain: HashChain;
  private readonly events: EventEmitter;
  private readonly logger: Logger;

  private collector: InputCollector | null = null;
  private challenge: ChallengeResponse | null = null;
  
  private state: LifecycleState = 'idle';
  private batchIndex = 0;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private gameTimer: ReturnType<typeof setTimeout> | null = null;
  private startTime = 0;

  constructor(config: PlayProofConfig) {
    this.config = mergeConfig(config);
    this.logger = this.config.logger;
    this.transport = new HttpTransport(this.config.apiUrl, {
      logger: this.logger,
    });
    this.hashChain = new HashChain();
    this.events = new EventEmitter();

    debugLog('PlayProofClient initialized', this.config);
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Get current state
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Initialize the SDK with a canvas element
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    this.ensureState('idle');
    
    ensureBrowser();
    checkRequiredFeatures();

    this.setState('initializing');

    metrics.mark('init-start');

    try {
      // Initialize input collector
      this.collector = new InputCollector(canvas, {
        bufferDuration: this.config.bufferDuration,
        logger: this.config.debug ? this.logger : undefined,
      });

      this.setState('ready');
      metrics.measure('init', 'init-start');
      this.events.emit('init');
      this.events.emit('ready');

      debugLog('Client initialized and ready');
    } catch (error) {
      this.setState('error');
      throw wrapError(error, 'Failed to initialize');
    }
  }

  /**
   * Start verification game
   */
  async start(): Promise<void> {
    this.ensureState('ready');
    metrics.mark('start-challenge');

    try {
      // Get challenge
      if (isMockMode()) {
        this.challenge = await createMockChallenge();
      } else {
        this.challenge = await this.transport.createChallenge();
      }

      metrics.measure('challenge', 'start-challenge');
      debugLog('Challenge received', this.challenge);

      // Reset state
      this.batchIndex = 0;
      this.hashChain.reset();

      // Start input collection
      this.collector?.start();

      // Start batch emission
      this.batchTimer = setInterval(
        () => this.emitBatch(),
        this.config.batchInterval
      );

      // Start game timer
      this.startTime = performance.now();
      this.gameTimer = setTimeout(
        () => this.endGame(),
        this.config.gameDuration
      );

      this.setState('playing');
      this.events.emit('start', { attemptId: this.challenge.attemptId });

      // Start progress updates
      this.updateProgress();

      debugLog('Game started', { attemptId: this.challenge.attemptId });
    } catch (error) {
      this.setState('error');
      this.events.emit('error', wrapError(error));
      throw wrapError(error, 'Failed to start verification');
    }
  }

  /**
   * Stop verification (cancel)
   */
  stop(): void {
    this.cleanup();
    this.setState('idle');
    debugLog('Game stopped');
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.cleanup();
    this.challenge = null;
    this.batchIndex = 0;
    this.hashChain.reset();
    this.setState('ready');
    debugLog('Client reset');
  }

  /**
   * Destroy the client
   */
  destroy(): void {
    this.cleanup();
    this.collector = null;
    this.events.off();
    this.setState('idle');
    debugLog('Client destroyed');
  }

  // =========================================================================
  // Event Subscriptions
  // =========================================================================

  /**
   * Subscribe to events
   */
  on<T extends keyof EventPayloads>(
    type: T,
    listener: (event: { type: string; timestamp: number; data?: EventPayloads[T] }) => void
  ): () => void {
    // Use type assertion for internal event system compatibility
    return this.events.on(type, listener as Parameters<typeof this.events.on<T>>[1]);
  }

  /**
   * Subscribe to events (one-time)
   */
  once<T extends keyof EventPayloads>(
    type: T,
    listener: (event: { type: string; timestamp: number; data?: EventPayloads[T] }) => void
  ): () => void {
    // Use type assertion for internal event system compatibility
    return this.events.once(type, listener as Parameters<typeof this.events.once<T>>[1]);
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private setState(state: LifecycleState): void {
    const prev = this.state;
    this.state = state;
    debugLog(`State: ${prev} -> ${state}`);
  }

  private ensureState(...allowed: LifecycleState[]): void {
    if (!allowed.includes(this.state)) {
      throw new StateError(
        `Operation not allowed in state '${this.state}'`,
        this.state,
        allowed
      );
    }
  }

  private cleanup(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    if (this.gameTimer) {
      clearTimeout(this.gameTimer);
      this.gameTimer = null;
    }
    this.collector?.stop();
  }

  private emitBatch(): void {
    if (!this.challenge || !this.collector) return;

    const events = this.collector.flush();
    if (events.length === 0) return;

    const batch: EventBatch = {
      attemptId: this.challenge.attemptId,
      batchIndex: this.batchIndex++,
      events,
      startTime: events[0].timestamp,
      endTime: events[events.length - 1].timestamp,
    };

    const signedBatch = this.hashChain.signBatch(batch);
    batchInspector.record(signedBatch);

    this.events.emit('batch', {
      batchIndex: batch.batchIndex,
      eventCount: events.length,
    });

    // Send batch (fire and forget)
    this.sendBatch(signedBatch).catch((error) => {
      this.logger.warn('Failed to send batch', error);
    });
  }

  private async sendBatch(signedBatch: SignedBatch): Promise<void> {
    if (!this.challenge) return;

    if (isMockMode()) {
      await createMockBatchResponse();
    } else {
      await this.transport.sendBatch(
        this.challenge.attemptId,
        this.challenge.challengeToken,
        signedBatch
      );
    }
  }

  private updateProgress(): void {
    if (this.state !== 'playing') return;

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.config.gameDuration, 1);
    const timeRemaining = Math.max(0, this.config.gameDuration - elapsed);

    this.events.emit('progress', { progress, timeRemaining });

    if (progress < 1) {
      requestAnimationFrame(() => this.updateProgress());
    }
  }

  private async endGame(): Promise<void> {
    this.cleanup();

    // Flush remaining events
    this.emitBatch();

    this.setState('processing');
    debugLog('Game ended, processing results');

    try {
      // Poll for result
      const result = await this.pollForResult();
      
      const verificationResult = this.createVerificationResult(result);
      
      this.setState('complete');
      this.events.emit('complete', verificationResult);

      debugLog('Verification complete', verificationResult);
    } catch (error) {
      this.setState('error');
      this.events.emit('error', wrapError(error));
      throw error;
    }
  }

  private async pollForResult(): Promise<AttemptResultResponse> {
    if (!this.challenge) {
      throw new ChallengeError('No active challenge');
    }

    const maxAttempts = 10;
    const pollInterval = 500;

    for (let i = 0; i < maxAttempts; i++) {
      let result: AttemptResultResponse;
      
      if (isMockMode()) {
        result = await createMockResult(this.challenge.attemptId);
      } else {
        result = await this.transport.getResult(this.challenge.attemptId);
      }

      if (result.result === 'regenerate') {
        this.events.emit('regenerate', { reason: result.reason || 'Unknown' });
        throw new ChallengeError('Regeneration required', this.challenge.attemptId);
      }

      if (result.result !== 'pending') {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new ChallengeError('Timeout waiting for result', this.challenge?.attemptId);
  }

  private createVerificationResult(
    result: AttemptResultResponse
  ): VerificationResult {
    const stats = this.collector?.getStats() ?? { eventCount: 0, timeSpan: 0 };

    return {
      passed: result.result === 'pass',
      score: result.score ?? 0,
      threshold: this.config.confidenceThreshold,
      timestamp: Date.now(),
      details: {
        mouseMovementCount: stats.eventCount,
        clickCount: 0, // Would need to count from batch inspector
        accuracy: result.score ?? 0,
      },
    };
  }
}
