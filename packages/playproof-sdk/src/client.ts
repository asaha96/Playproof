// PlayProof Client - Main SDK interface
import type { 
  PlayProofConfig, 
  ChallengeResponse, 
  AttemptResultResponse
} from './types';
import { InputCollector } from './collector/InputCollector';
import { HashChain } from './transport/HashChain';
import { HttpTransport } from './transport/HttpTransport';

export class PlayProofClient {
  private config: Required<PlayProofConfig>;
  private collector: InputCollector | null = null;
  private hashChain: HashChain | null = null;
  private transport: HttpTransport;
  private currentChallenge: ChallengeResponse | null = null;
  private batchInterval: ReturnType<typeof setInterval> | null = null;
  private gameTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: PlayProofConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      gameDuration: config.gameDuration ?? 3000,
      batchInterval: config.batchInterval ?? 500,
      bufferDuration: config.bufferDuration ?? 5,
      onEventBatch: config.onEventBatch ?? (() => {}),
      onAttemptEnd: config.onAttemptEnd ?? (() => {}),
      onRegenerate: config.onRegenerate ?? (() => {}),
    };
    this.transport = new HttpTransport(this.config.apiUrl);
  }

  async createChallenge(): Promise<ChallengeResponse> {
    this.currentChallenge = await this.transport.createChallenge();
    this.hashChain = new HashChain();
    return this.currentChallenge;
  }

  mount(canvas: HTMLCanvasElement): void {
    if (!this.currentChallenge) {
      throw new Error('Must call createChallenge() before mount()');
    }

    this.collector = new InputCollector(canvas, {
      bufferDuration: this.config.bufferDuration,
    });
    this.collector.start();

    // Start batch emission interval
    this.batchInterval = setInterval(() => {
      this.emitBatch();
    }, this.config.batchInterval);

    // Set game timeout
    this.gameTimeout = setTimeout(() => {
      this.endAttempt();
    }, this.config.gameDuration);
  }

  private async emitBatch(): Promise<void> {
    if (!this.collector || !this.currentChallenge || !this.hashChain) return;

    const events = this.collector.flush();
    if (events.length === 0) return;

    const signedBatch = this.hashChain.signBatch({
      attemptId: this.currentChallenge.attemptId,
      batchIndex: this.hashChain.getBatchCount(),
      events,
      startTime: events[0]?.timestamp ?? 0,
      endTime: events[events.length - 1]?.timestamp ?? 0,
    });

    this.config.onEventBatch(signedBatch);

    try {
      await this.transport.sendBatch(
        this.currentChallenge.attemptId,
        this.currentChallenge.challengeToken,
        signedBatch
      );
    } catch (error) {
      console.error('Failed to send batch:', error);
    }
  }

  private async endAttempt(): Promise<void> {
    // Stop intervals
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    if (this.gameTimeout) {
      clearTimeout(this.gameTimeout);
      this.gameTimeout = null;
    }

    // Final batch emission
    await this.emitBatch();

    // Stop collector
    if (this.collector) {
      this.collector.stop();
    }

    // Poll for result
    if (this.currentChallenge) {
      const result = await this.pollResult(this.currentChallenge.attemptId);
      this.config.onAttemptEnd(result);

      if (result.result === 'regenerate') {
        this.config.onRegenerate(result.reason ?? 'Unknown reason');
      }
    }
  }

  private async pollResult(attemptId: string, maxAttempts = 10): Promise<AttemptResultResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.transport.getResult(attemptId);
      if (result.result !== 'pending') {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return { attemptId, result: 'pending' };
  }

  regenerate(reason: string): void {
    this.config.onRegenerate(reason);
    // Clean up current attempt
    this.cleanup();
  }

  cleanup(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    if (this.gameTimeout) {
      clearTimeout(this.gameTimeout);
      this.gameTimeout = null;
    }
    if (this.collector) {
      this.collector.stop();
      this.collector = null;
    }
    this.hashChain = null;
    this.currentChallenge = null;
  }

  getChallenge(): ChallengeResponse | null {
    return this.currentChallenge;
  }
}
