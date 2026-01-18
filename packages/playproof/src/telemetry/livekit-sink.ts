/**
 * LiveKitSink - Publishes telemetry to LiveKit for real-time streaming
 * 
 * This sink connects to a LiveKit room and publishes pointer telemetry
 * as data messages. The dashboard can subscribe to receive these events
 * in real-time.
 */

import type { Room as RoomType, RoomEvent as RoomEventType, ConnectionQuality as ConnectionQualityType } from 'livekit-client';
import type { PointerTelemetryEvent } from '../types';
import type { TelemetrySink } from './sink';
import { PLAYPROOF_API_URL } from '../config';

// Dynamic import of livekit-client to avoid SSR issues
let livekitModule: typeof import('livekit-client') | null = null;

async function getLivekitModule() {
  if (!livekitModule) {
    livekitModule = await import('livekit-client');
  }
  return livekitModule;
}

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
  private room: RoomType | null = null;
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

      // Dynamically import livekit-client to avoid SSR issues
      const { Room, RoomEvent } = await getLivekitModule();

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

      this.room.on(RoomEvent.ConnectionQualityChanged, (quality) => {
        console.log('[LiveKitSink] Connection quality:', quality);
      });

      // Store attempt info
      this.attemptId = tokenResponse.attemptId!;
      this.roomName = tokenResponse.roomName!;

      // Connect to room
      await this.room.connect(tokenResponse.livekitUrl!, tokenResponse.token!);
      // Note: connected flag is set by RoomEvent.Connected handler above
      
    } catch (error) {
      console.error(
        '[LiveKitSink] Failed to connect to LiveKit. Real-time LiveKit telemetry will be disabled for this session (hook sink will still work). Underlying error:',
        error,
      );
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from LiveKit room
   */
  disconnect(): void {
    try {
      if (this.room) {
        this.room.disconnect();
        this.room = null;
      }
    } catch (error) {
      console.warn('[LiveKitSink] Error during disconnect:', error);
    } finally {
      this.connected = false;
      this.attemptId = null;
      this.roomName = null;
      this.seq = 0;
    }
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
    return this.connected && this.room?.localParticipant != null;
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
   * Request a publisher token from the Next.js API
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
      const response = await fetch(`${PLAYPROOF_API_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          deploymentId: this.config.deploymentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
