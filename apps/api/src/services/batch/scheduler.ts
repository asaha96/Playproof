/**
 * Batch Inference Scheduler
 * ========================
 * Background job that periodically processes queued sessions
 */

import { processBatch, getBatchStats } from "./inference.js";
import { sessionQueue } from "./queue.js";

interface SchedulerConfig {
  intervalMs: number; // How often to check for batches
  minBatchSize: number; // Minimum sessions before processing
  maxWaitTime: number; // Max time to wait even if batch is small
}

const defaultConfig: SchedulerConfig = {
  intervalMs: 30000, // Check every 30 seconds
  minBatchSize: 10, // Process if we have at least 10 sessions
  maxWaitTime: 5 * 60 * 1000, // Process after 5 minutes even if batch is small
};

class BatchScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessed: number = 0;
  private config: SchedulerConfig;
  private isProcessing: boolean = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.intervalId) {
      console.warn("[BatchScheduler] Already running");
      return;
    }

    console.log(`[BatchScheduler] Starting (interval: ${this.config.intervalMs}ms)`);
    this.lastProcessed = Date.now();

    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.intervalMs);

    // Process immediately on start if we have enough sessions
    this.tick();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[BatchScheduler] Stopped");
    }
  }

  /**
   * Process a batch if conditions are met
   */
  private async tick(): Promise<void> {
    if (this.isProcessing) {
      return; // Skip if already processing
    }

    const stats = getBatchStats();
    const timeSinceLastProcess = Date.now() - this.lastProcessed;

    // Check if we should process
    const shouldProcess =
      stats.unprocessed >= this.config.minBatchSize ||
      (stats.unprocessed > 0 && timeSinceLastProcess >= this.config.maxWaitTime);

    if (!shouldProcess) {
      return;
    }

    this.isProcessing = true;

    try {
      console.log(`[BatchScheduler] Processing batch (${stats.unprocessed} unprocessed)`);
      const result = await processBatch();
      this.lastProcessed = Date.now();

      console.log(
        `[BatchScheduler] Batch complete: ${result.processed} processed, ${result.success} success, ${result.failed} failed`
      );

      // Clean up old processed sessions
      const cleared = sessionQueue.clearOld();
      if (cleared > 0) {
        console.log(`[BatchScheduler] Cleared ${cleared} old sessions`);
      }
    } catch (error) {
      console.error("[BatchScheduler] Batch processing error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually trigger a batch (for testing/admin)
   */
  async trigger(): Promise<void> {
    await this.tick();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    isProcessing: boolean;
    lastProcessed: number;
    stats: ReturnType<typeof getBatchStats>;
  } {
    return {
      running: this.intervalId !== null,
      isProcessing: this.isProcessing,
      lastProcessed: this.lastProcessed,
      stats: getBatchStats(),
    };
  }
}

// Singleton instance
export const batchScheduler = new BatchScheduler();
