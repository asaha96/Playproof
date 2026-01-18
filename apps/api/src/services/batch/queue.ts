/**
 * Session Queue for Batch Inference
 * ==================================
 * Queues sessions for batch processing instead of real-time inference.
 */

import type { SessionTelemetry, MovementFeatures } from "@playproof/shared";

export interface QueuedSession {
  sessionId: string;
  telemetry: SessionTelemetry;
  features: MovementFeatures;
  queuedAt: number;
  processed: boolean;
  result?: {
    anomalyScore: number;
    isAnomaly: boolean;
    decision: "pass" | "review" | "fail";
  };
}

class SessionQueue {
  private queue: Map<string, QueuedSession> = new Map();
  private maxQueueSize: number = 1000; // Max sessions before forcing a batch

  /**
   * Add a session to the queue
   */
  enqueue(sessionId: string, telemetry: SessionTelemetry, features: MovementFeatures): void {
    if (this.queue.size >= this.maxQueueSize) {
      console.warn(`[BatchQueue] Queue full (${this.maxQueueSize}), oldest sessions may be dropped`);
    }

    this.queue.set(sessionId, {
      sessionId,
      telemetry,
      features,
      queuedAt: Date.now(),
      processed: false,
    });
  }

  /**
   * Get all unprocessed sessions
   */
  getUnprocessed(): QueuedSession[] {
    return Array.from(this.queue.values()).filter((s) => !s.processed);
  }

  /**
   * Get sessions ready for batch (unprocessed, up to batchSize)
   */
  getBatch(batchSize: number = 100): QueuedSession[] {
    const unprocessed = this.getUnprocessed();
    return unprocessed.slice(0, batchSize);
  }

  /**
   * Mark sessions as processed with results
   */
  markProcessed(sessionIds: string[], results: Map<string, QueuedSession["result"]>): void {
    for (const sessionId of sessionIds) {
      const session = this.queue.get(sessionId);
      if (session) {
        session.processed = true;
        session.result = results.get(sessionId);
      }
    }
  }

  /**
   * Get result for a session (if processed)
   */
  getResult(sessionId: string): QueuedSession["result"] | null {
    const session = this.queue.get(sessionId);
    return session?.result || null;
  }

  /**
   * Check if session is in queue
   */
  has(sessionId: string): boolean {
    return this.queue.has(sessionId);
  }

  /**
   * Get queue stats
   */
  getStats(): {
    total: number;
    unprocessed: number;
    processed: number;
  } {
    const all = Array.from(this.queue.values());
    return {
      total: all.length,
      unprocessed: all.filter((s) => !s.processed).length,
      processed: all.filter((s) => s.processed).length,
    };
  }

  /**
   * Clear processed sessions older than maxAge (ms)
   */
  clearOld(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [sessionId, session] of this.queue.entries()) {
      if (session.processed && now - session.queuedAt > maxAge) {
        this.queue.delete(sessionId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all sessions (for testing/reset)
   */
  clear(): void {
    this.queue.clear();
  }
}

// Singleton instance
export const sessionQueue = new SessionQueue();
