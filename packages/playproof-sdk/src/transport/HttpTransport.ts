/**
 * HTTP Transport
 * 
 * API communication with retry logic and error handling.
 * 
 * @packageDocumentation
 */

import type {
  ChallengeResponse,
  SignedBatch,
  AttemptResultResponse,
  Logger,
} from '../types';
import {
  NetworkError,
  TimeoutError,
  networkErrorFromResponse,
  wrapError,
} from '../errors';

/**
 * Transport configuration
 */
export interface HttpTransportConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  retryDelay?: number;
  /** Logger instance */
  logger?: Logger;
}

/**
 * Default transport configuration
 */
const DEFAULT_CONFIG: Required<Omit<HttpTransportConfig, 'logger'>> = {
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * HTTP transport for API communication
 */
export class HttpTransport {
  private baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly logger?: Logger;

  constructor(baseUrl: string, config: HttpTransportConfig = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay ?? DEFAULT_CONFIG.retryDelay;
    this.logger = config.logger;
  }

  /**
   * Create a new challenge
   */
  async createChallenge(): Promise<ChallengeResponse> {
    return this.requestWithRetry<ChallengeResponse>(
      'POST',
      '/v1/challenge',
      undefined,
      'Create challenge'
    );
  }

  /**
   * Send a signed batch
   */
  async sendBatch(
    attemptId: string,
    challengeToken: string,
    signedBatch: SignedBatch
  ): Promise<void> {
    await this.requestWithRetry(
      'POST',
      `/v1/attempts/${attemptId}/batches`,
      JSON.stringify(signedBatch),
      'Send batch',
      {
        'Content-Type': 'application/json',
        'X-Challenge-Token': challengeToken,
      }
    );
  }

  /**
   * Get attempt result
   */
  async getResult(attemptId: string): Promise<AttemptResultResponse> {
    return this.requestWithRetry<AttemptResultResponse>(
      'GET',
      `/v1/attempts/${attemptId}/result`,
      undefined,
      'Get result'
    );
  }

  /**
   * Make a request with retry logic
   */
  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: string,
    context?: string,
    headers?: Record<string, string>
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.request<T>(method, path, body, headers);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-recoverable errors
        if (error instanceof NetworkError) {
          const status = error.statusCode;
          if (status && status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          this.logger?.warn(
            `${context || 'Request'} failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms...`,
            lastError.message
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new NetworkError('Request failed after retries');
  }

  /**
   * Make a single request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: string,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...customHeaders,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await networkErrorFromResponse(response, `${method} ${path}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`${method} ${path}`, this.timeout);
      }
      if (error instanceof NetworkError) {
        throw error;
      }
      throw wrapError(error, `${method} ${path}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
}
