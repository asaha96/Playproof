/**
 * Telemetry Processor Service
 * ============================
 * Subscribes to LiveKit room as server participant,
 * buffers incoming pointer events, and triggers window scoring.
 */

// Dynamic import to avoid bundling native modules in Next.js
let rtcNodeModule: typeof import("@livekit/rtc-node") | null = null;

async function getRtcNodeModule() {
  if (!rtcNodeModule) {
    rtcNodeModule = await import("@livekit/rtc-node");
  }
  return rtcNodeModule;
}

type Room = import("@livekit/rtc-node").Room;
type RoomEvent = typeof import("@livekit/rtc-node").RoomEvent;
type DataPacketKind = import("@livekit/rtc-node").DataPacketKind;
type RemoteParticipant = import("@livekit/rtc-node").RemoteParticipant;
import { WindowedScorer, type WindowScore, type PointerTelemetryEvent } from "./windowed-scorer";
import { agentConfig } from "./config";

// Telemetry topic (must match SDK)
const POINTER_TOPIC = "playproof.pointer.v1";

/**
 * Parsed telemetry message from SDK
 */
interface TelemetryMessage {
  v: number;
  seq: number;
  ts: number;
  events: PointerTelemetryEvent[];
}

/**
 * Session state for a single verification attempt
 */
export interface SessionState {
  attemptId: string;
  roomName: string;
  startedAt: number;
  eventBuffer: PointerTelemetryEvent[];
  allEvents: PointerTelemetryEvent[];
  windowScores: WindowScore[];
  scorer: WindowedScorer;
  lastEventTime: number;
  isActive: boolean;
}

/**
 * Telemetry Processor
 * Manages LiveKit room connection and event buffering
 */
export class TelemetryProcessor {
  private room: Room | null = null;
  private sessionState: SessionState | null = null;
  private onWindowScored?: (scores: WindowScore[]) => void;
  private onSessionEnd?: (reason: string) => void;
  private windowScoringInterval: ReturnType<typeof setInterval> | null = null;
  private telemetryLogCount = 0;
  private loggedNoEvents = false;

  constructor(config?: {
    onWindowScored?: (scores: WindowScore[]) => void;
    onSessionEnd?: (reason: string) => void;
  }) {
    this.onWindowScored = config?.onWindowScored;
    this.onSessionEnd = config?.onSessionEnd;
  }

  /**
   * Connect to a LiveKit room as server participant
   */
  async connect(
    livekitUrl: string,
    token: string,
    roomName: string,
    attemptId: string
  ): Promise<void> {
    if (this.room) {
      await this.disconnect();
    }

    const { Room } = await getRtcNodeModule();
    this.room = new Room();
    const now = Date.now();

    console.log("[TelemetryProcessor] Connecting to LiveKit", {
      roomName,
      attemptId,
      livekitUrl,
    });

    // Initialize session state
    this.sessionState = {
      attemptId,
      roomName,
      startedAt: now,
      eventBuffer: [],
      allEvents: [],
      windowScores: [],
      scorer: new WindowedScorer(now),
      lastEventTime: now,
      isActive: true,
    };

    // Set up event handlers
    await this.setupEventHandlers();

    // Connect to room
    await this.room.connect(livekitUrl, token);

    console.log(`[TelemetryProcessor] Connected to room ${roomName} for attempt ${attemptId}`);

    // Start periodic window scoring
    this.startWindowScoring();
  }

  /**
   * Set up LiveKit event handlers
   */
  private async setupEventHandlers(): Promise<void> {
    if (!this.room) return;

    const { RoomEvent } = await getRtcNodeModule();

    // Handle incoming data messages
    this.room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant, kind?: DataPacketKind, topic?: string) => {
      if (topic !== POINTER_TOPIC) return;
      this.handleTelemetryData(payload);
    });

    // Handle participant disconnect
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      // Check if SDK participant disconnected
      if (participant.identity.startsWith("sdk_")) {
        console.log(`[TelemetryProcessor] SDK participant disconnected: ${participant.identity}`);
        this.handleSdkDisconnect();
      }
    });

    // Handle room disconnect
    this.room.on(RoomEvent.Disconnected, () => {
      console.log("[TelemetryProcessor] Room disconnected");
      this.endSession();
      this.onSessionEnd?.("room_disconnected");
    });
  }

  /**
   * Handle incoming telemetry data
   */
  private handleTelemetryData(payload: Uint8Array): void {
    if (!this.sessionState) return;

    try {
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(payload);
      const message: TelemetryMessage = JSON.parse(jsonStr);

      if (message.v !== 1) {
        console.warn(`[TelemetryProcessor] Unsupported protocol version: ${message.v}`);
        return;
      }

      // Add events to buffer
      this.sessionState.eventBuffer.push(...message.events);
      this.sessionState.allEvents.push(...message.events);
      this.sessionState.lastEventTime = Date.now();

      if (this.telemetryLogCount < 10) {
        console.log("[TelemetryProcessor] Telemetry batch received", {
          seq: message.seq,
          eventCount: message.events.length,
          totalBuffered: this.sessionState.eventBuffer.length,
        });
        this.telemetryLogCount += 1;
      }

    } catch (error) {
      console.error("[TelemetryProcessor] Error parsing telemetry data:", error);
    }
  }

  /**
   * Handle SDK participant disconnect
   */
  private handleSdkDisconnect(): void {
    if (!this.sessionState) return;

    // Wait for reconnection grace period
    setTimeout(() => {
      if (!this.sessionState?.isActive) return;

      // Check if participant reconnected
      const sdkParticipant = Array.from(this.room?.remoteParticipants.values() || [])
        .find((p) => p.identity.startsWith("sdk_"));

      if (!sdkParticipant) {
        console.log("[TelemetryProcessor] SDK participant did not reconnect, ending session");
        this.endSession();
        this.onSessionEnd?.("sdk_disconnected");
      }
    }, agentConfig.reconnectionGraceMs);
  }

  /**
   * Start periodic window scoring
   */
  private startWindowScoring(): void {
    // Score windows every window duration
    this.windowScoringInterval = setInterval(() => {
      this.processWindows();
    }, agentConfig.windowDurationMs);
  }

  /**
   * Process pending windows and score them
   */
  private processWindows(): void {
    if (!this.sessionState || !this.sessionState.isActive) return;

    const currentMs = Date.now();
    const scores = this.sessionState.scorer.scoreWindowsCumulative(
      this.sessionState.eventBuffer,
      this.sessionState.allEvents,
      currentMs
    );

    if (scores.length > 0) {
      // Store scores
      this.sessionState.windowScores.push(...scores);

      // Notify listener
      this.onWindowScored?.(scores);

      // Cleanup old events from buffer (keep overlap for next window)
      const cleanupThreshold = this.sessionState.scorer.getLastWindowEndMs();
      this.sessionState.eventBuffer = this.sessionState.eventBuffer.filter(
        (e) => e.timestampMs >= cleanupThreshold
      );
    } else if (this.sessionState.eventBuffer.length === 0 && !this.loggedNoEvents) {
      console.log("[TelemetryProcessor] No telemetry events buffered yet");
      this.loggedNoEvents = true;
    }

    // Check for session timeout
    const elapsed = currentMs - this.sessionState.startedAt;
    if (elapsed >= agentConfig.maxSessionMs) {
      console.log("[TelemetryProcessor] Session timeout reached");
      this.onSessionEnd?.("timeout");
    }
  }

  /**
   * Get current session state (for agent scheduler)
   */
  getSessionState(): SessionState | null {
    return this.sessionState;
  }

  /**
   * Get accumulated window scores
   */
  getWindowScores(): WindowScore[] {
    return this.sessionState?.windowScores || [];
  }

  /**
   * Get session elapsed time in ms
   */
  getElapsedMs(): number {
    if (!this.sessionState) return 0;
    return Date.now() - this.sessionState.startedAt;
  }

  /**
   * Mark session as ended
   */
  endSession(): void {
    if (this.sessionState) {
      this.sessionState.isActive = false;
    }
  }

  /**
   * Disconnect from room and cleanup
   */
  async disconnect(): Promise<void> {
    if (this.windowScoringInterval) {
      clearInterval(this.windowScoringInterval);
      this.windowScoringInterval = null;
    }

    if (this.sessionState) {
      this.sessionState.isActive = false;
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    this.sessionState = null;
  }

  /**
   * Publish a control message to the room
   */
  async publishControlMessage(message: object): Promise<void> {
    if (!this.room?.localParticipant) {
      console.warn("[TelemetryProcessor] Cannot publish: not connected");
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(message));

    await this.room.localParticipant.publishData(data, {
      reliable: true,
      topic: agentConfig.controlTopic,
    });

    console.log("[TelemetryProcessor] Published control message:", message);
  }
}
