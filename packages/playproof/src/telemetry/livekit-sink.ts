/**
 * LiveKitSink - Publishes telemetry to LiveKit for real-time streaming
 * 
 * This sink connects to a LiveKit room and publishes pointer telemetry
 * as data messages. The dashboard can subscribe to receive these events
 * in real-time.
 */

import { Room, RoomEvent, ConnectionQuality } from 'livekit-client';
import type { PointerTelemetryEvent } from '../types';
import type { TelemetrySink } from './sink';
import { PLAYPROOF_API_URL } from '../config';

// Telemetry topic for pointer events (versioned for future compatibility)
export const POINTER_TOPIC = 'playproof.pointer.v1';

/**
 * Configuration for LiveKitSink
 */
export interface LiveKitSinkConfig {
  apiKey: string;
  deploymentId: string;
  onConnected?: (roomName: string, attemptId: string) => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * LiveKitSink - Sends telemetry to LiveKit room
 */
export class LiveKitSink implements TelemetrySink {
  private config: LiveKitSinkConfig;
  private room: Room | null = null;
  private connected = false;
  private attemptId: string | null = null;
  private roomName: string | null = null;
  private seq = 0; // Sequence number for ordering

  constructor(config: LiveKitSinkConfig) {
    this.config = config;
  }

  /**
   * Connect to LiveKit room
   * This fetches a publisher token from Convex and connects to the room
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Request publisher token from Convex
      const tokenResponse = await this.requestPublisherToken();
      
      if (!tokenResponse.success) {
        throw new Error(tokenResponse.error || 'Failed to get LiveKit token');
      }

      // Create and connect room
      this.room = new Room();
      
      this.room.on(RoomEvent.Connected, () => {
        this.connected = true;
        console.log('[LiveKitSink] Connected to room:', this.roomName);
        this.config.onConnected?.(this.roomName!, this.attemptId!);
      });

      this.room.on(RoomEvent.Disconnected, () => {
        this.connected = false;
        console.log('[LiveKitSink] Disconnected from room');
        this.config.onDisconnected?.();
      });

      this.room.on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
        console.log('[LiveKitSink] Connection quality:', quality);
      });

      // Store attempt info
      this.attemptId = tokenResponse.attemptId!;
      this.roomName = tokenResponse.roomName!;

      // Connect to room
      await this.room.connect(tokenResponse.livekitUrl!, tokenResponse.token!);
      this.connected = true;
      
    } catch (error) {
      console.error('[LiveKitSink] Connection error:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from LiveKit room
   */
  disconnect(): void {
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
    this.connected = false;
    this.attemptId = null;
    this.roomName = null;
    this.seq = 0;
  }

  /**
   * Send a batch of pointer telemetry events
   * 
   * @param batch - Array of pointer events
   * @param reliable - If true, use RELIABLE delivery (for important events like down/up)
   *                   If false, use LOSSY delivery (for high-frequency move events)
   */
  sendPointerBatch(batch: PointerTelemetryEvent[], reliable = false): void {
    if (!this.connected || !this.room?.localParticipant) {
      return;
    }

    try {
      // Create message with sequence number for ordering
      const message = {
        v: 1, // Protocol version
        seq: this.seq++,
        ts: Date.now(),
        events: batch,
      };

      // Encode as JSON (could optimize to binary later)
      const data = new TextEncoder().encode(JSON.stringify(message));

      // Publish data with appropriate reliability
      this.room.localParticipant.publishData(data, {
        reliable,
        topic: POINTER_TOPIC,
      });
    } catch (error) {
      console.error('[LiveKitSink] Error publishing data:', error);
    }
  }

  /**
   * Check if connected and ready to send
   */
  isReady(): boolean {
    return this.connected && this.room?.localParticipant !== undefined;
  }

  /**
   * Get the current attempt ID
   */
  getAttemptId(): string | null {
    return this.attemptId;
  }

  /**
   * Get the current room name
   */
  getRoomName(): string | null {
    return this.roomName;
  }

  /**
   * Request a publisher token from Convex
   */
  private async requestPublisherToken(): Promise<{
    success: boolean;
    error?: string;
    livekitUrl?: string;
    token?: string;
    roomName?: string;
    attemptId?: string;
  }> {
    try {
      const response = await fetch(`${PLAYPROOF_API_URL}/api/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'livekit:createAttemptAndPublisherToken',
          args: {
            apiKey: this.config.apiKey,
            deploymentId: this.config.deploymentId,
          },
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result = await response.json();
      
      // Convex action returns { value: {...} } format
      if (result.value) {
        return result.value;
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

export default LiveKitSink;
