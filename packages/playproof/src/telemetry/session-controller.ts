/**
 * Session Controller
 * ===================
 * Listens for control messages from the server agent
 * and manages the session lifecycle on the SDK side.
 */

import type { Room as RoomType, RoomEvent as RoomEventType } from "livekit-client";

// Control topic for session messages (must match server)
export const CONTROL_TOPIC = "playproof.control.v1";

/**
 * Session end result from agent
 */
export interface SessionEndResult {
  type: "session_end";
  decision: "human" | "bot";
  confidence: number;
  reason: string;
  timestamp: number;
}

/**
 * Session controller configuration
 */
export interface SessionControllerConfig {
  room: RoomType | null;
  maxDuration: number; // Maximum session duration in ms (safety timeout)
  onSessionEnd: (result: SessionEndResult) => void;
  onTimeout?: () => void;
}

/**
 * Session Controller
 * Listens for control messages and manages session lifecycle
 */
export class SessionController {
  private room: RoomType | null;
  private maxDuration: number;
  private onSessionEnd: (result: SessionEndResult) => void;
  private onTimeout?: () => void;

  private isStarted = false;
  private isEnded = false;
  private startTime = 0;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  // LiveKit module (loaded dynamically)
  private livekitModule: typeof import("livekit-client") | null = null;

  constructor(config: SessionControllerConfig) {
    this.room = config.room;
    this.maxDuration = config.maxDuration;
    this.onSessionEnd = config.onSessionEnd;
    this.onTimeout = config.onTimeout;
  }

  /**
   * Start listening for control messages
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    this.isStarted = true;
    this.isEnded = false;
    this.startTime = Date.now();

    if (!this.room) {
      console.warn("[SessionController] start() called without a LiveKit room");
    } else {
      console.log("[SessionController] start() using room", {
        roomName: this.room.name,
        connected: this.room.state,
      });
    }

    // Load LiveKit module dynamically
    this.livekitModule = await import("livekit-client");

    // Set up control message listener
    this.setupControlListener();

    // Set safety timeout
    this.timeoutHandle = setTimeout(() => {
      this.handleTimeout();
    }, this.maxDuration);

    console.log(
      `[SessionController] Started with ${this.maxDuration}ms timeout`
    );
  }

  /**
   * Set up the control message listener
   */
  private setupControlListener(): void {
    if (!this.room || !this.livekitModule) {
      console.warn("[SessionController] Cannot set up control listener", {
        hasRoom: Boolean(this.room),
        hasLiveKitModule: Boolean(this.livekitModule),
      });
      return;
    }

    const { RoomEvent } = this.livekitModule;

    this.room.on(
      RoomEvent.DataReceived,
      (
        payload: Uint8Array,
        participant: unknown,
        kind: unknown,
        topic?: string
      ) => {
        if (topic !== CONTROL_TOPIC) return;
        this.handleControlMessage(payload);
      }
    );

    console.log("[SessionController] Control listener registered", {
      topic: CONTROL_TOPIC,
    });
  }

  /**
   * Handle incoming control message
   */
  private handleControlMessage(payload: Uint8Array): void {
    if (this.isEnded) return;

    try {
      const decoder = new TextDecoder();
      const jsonStr = decoder.decode(payload);
      const message = JSON.parse(jsonStr);

      console.log("[SessionController] Received control message:", message);

      if (message.type === "session_end") {
        this.handleSessionEnd(message as SessionEndResult);
      }
    } catch (error) {
      console.error(
        "[SessionController] Error parsing control message:",
        error
      );
    }
  }

  /**
   * Handle session end from agent
   */
  private handleSessionEnd(result: SessionEndResult): void {
    if (this.isEnded) return;

    this.isEnded = true;

    // Clear timeout
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    console.log(
      `[SessionController] Session ended by agent: ${result.decision} (confidence: ${result.confidence.toFixed(2)})`
    );
    console.log(`[SessionController] Reason: ${result.reason}`);

    // Notify callback
    this.onSessionEnd(result);
  }

  /**
   * Handle safety timeout
   */
  private handleTimeout(): void {
    if (this.isEnded) return;

    this.isEnded = true;
    this.timeoutHandle = null;

    console.warn(
      `[SessionController] Session timeout after ${this.maxDuration}ms`
    );

    // Create timeout result
    const timeoutResult: SessionEndResult = {
      type: "session_end",
      decision: "bot", // Default to bot on timeout (fail-closed)
      confidence: 0.5,
      reason: `Session timeout (${this.maxDuration}ms) - no agent decision received`,
      timestamp: Date.now(),
    };

    // Notify timeout callback if provided
    this.onTimeout?.();

    // Notify session end callback
    this.onSessionEnd(timeoutResult);
  }

  /**
   * Get elapsed time since session start
   */
  getElapsedMs(): number {
    if (!this.isStarted) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Check if session has ended
   */
  hasEnded(): boolean {
    return this.isEnded;
  }

  /**
   * Stop the controller and clean up
   */
  stop(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    this.isStarted = false;
    // Note: We don't set isEnded here because stop() might be called
    // before a natural end, and we don't want to trigger callbacks
  }

  /**
   * Update the room reference (if reconnecting)
   */
  setRoom(room: RoomType | null): void {
    this.room = room;
    if (this.isStarted && room) {
      this.setupControlListener();
    }
  }
}
