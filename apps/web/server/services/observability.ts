/**
 * Observability Service
 * =====================
 * Tracks Woodwide API usage, errors, and fallback rates
 */

export interface WoodwideMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  creditErrors: number;
  emptyResponses: number;
  fallbackToHeuristics: number;
  averageResponseTimeMs: number;
  lastError?: {
    timestamp: string;
    error: string;
    errorCode?: string;
  };
}

class ObservabilityService {
  private metrics: WoodwideMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    creditErrors: 0,
    emptyResponses: 0,
    fallbackToHeuristics: 0,
    averageResponseTimeMs: 0,
  };

  private responseTimes: number[] = [];

  /**
   * Track a Woodwide API call
   */
  trackCall(success: boolean, responseTimeMs: number, error?: Error) {
    this.metrics.totalCalls++;
    this.responseTimes.push(responseTimeMs);

    // Update average response time (keep last 100)
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    this.metrics.averageResponseTimeMs =
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    if (success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
      if (error) {
        this.metrics.lastError = {
          timestamp: new Date().toISOString(),
          error: error.message,
          errorCode: this.extractErrorCode(error.message),
        };

        // Track specific error types
        if (this.isCreditError(error)) {
          this.metrics.creditErrors++;
          this.logCreditError(error);
        } else if (this.isEmptyResponse(error)) {
          this.metrics.emptyResponses++;
        }
      }
    }
  }

  /**
   * Track fallback to heuristics
   */
  trackFallback(reason: string, error?: Error) {
    this.metrics.fallbackToHeuristics++;
    this.logFallback(reason, error);
  }

  /**
   * Get current metrics
   */
  getMetrics(): WoodwideMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalCalls === 0) return 0;
    return (this.metrics.successfulCalls / this.metrics.totalCalls) * 100;
  }

  /**
   * Check if error is a credit/token error
   */
  private isCreditError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("402") ||
      message.includes("credit") ||
      message.includes("token") ||
      message.includes("must have at least")
    );
  }

  /**
   * Check if error is empty response
   */
  private isEmptyResponse(error: Error): boolean {
    return error.message.toLowerCase().includes("empty response");
  }

  /**
   * Extract error code from error message
   */
  private extractErrorCode(message: string): string | undefined {
    // Extract HTTP status codes
    const statusMatch = message.match(/(\d{3})/);
    if (statusMatch) {
      return statusMatch[1];
    }
    return undefined;
  }

  /**
   * Log credit error with structured format
   */
  private logCreditError(error: Error) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        service: "woodwide",
        type: "credit_error",
        message: "Woodwide API credits exhausted",
        error: error.message,
        timestamp: new Date().toISOString(),
        action: "fallback_to_heuristics",
      })
    );
  }

  /**
   * Log fallback with structured format
   */
  private logFallback(reason: string, error?: Error) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        service: "woodwide",
        type: "fallback",
        reason,
        error: error?.message,
        timestamp: new Date().toISOString(),
        metrics: {
          totalCalls: this.metrics.totalCalls,
          successRate: this.getSuccessRate(),
          creditErrors: this.metrics.creditErrors,
        },
      })
    );
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      creditErrors: 0,
      emptyResponses: 0,
      fallbackToHeuristics: 0,
      averageResponseTimeMs: 0,
    };
    this.responseTimes = [];
  }
}

export const observability = new ObservabilityService();
