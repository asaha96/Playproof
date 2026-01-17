// HTTP Transport for API communication
import type { ChallengeResponse, SignedBatch, AttemptResultResponse } from '../types';
import { MessagePackCodec } from './MessagePackCodec';

export class HttpTransport {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Create a new challenge/attempt
   */
  async createChallenge(): Promise<ChallengeResponse> {
    const response = await fetch(`${this.baseUrl}/v1/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to create challenge: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send a signed batch to the API
   */
  async sendBatch(
    attemptId: string,
    challengeToken: string,
    signedBatch: SignedBatch
  ): Promise<void> {
    // Encode the signed batch as MessagePack
    const payload = MessagePackCodec.encodeSignedBatch(signedBatch);

    // Convert Uint8Array to ArrayBuffer for fetch body
    const bodyBuffer = payload.buffer.slice(
      payload.byteOffset,
      payload.byteOffset + payload.byteLength
    ) as ArrayBuffer;

    const response = await fetch(
      `${this.baseUrl}/v1/attempts/${attemptId}/batches`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/msgpack',
          'X-Challenge-Token': challengeToken,
        },
        body: bodyBuffer,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send batch: ${response.status} - ${error}`);
    }
  }

  /**
   * Get the result of an attempt
   */
  async getResult(attemptId: string): Promise<AttemptResultResponse> {
    const response = await fetch(
      `${this.baseUrl}/v1/attempts/${attemptId}/result`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get result: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Update base URL (useful for dynamic configuration)
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
}
