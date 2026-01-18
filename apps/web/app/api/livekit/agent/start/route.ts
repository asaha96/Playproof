/**
 * POST /api/livekit/agent/start
 *
 * Starts the real-time AI agent for a verification session.
 * This creates an agent participant that joins the LiveKit room,
 * processes telemetry, and decides when to end the session.
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../../convex/_generated/api";
import {
  TelemetryProcessor,
  AgentScheduler,
  type WindowScore,
} from "@/server/services/realtime";

export const runtime = "nodejs"; // Required for @livekit/rtc-node native bindings

// Create Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Active agent sessions (keyed by attemptId)
const activeSessions = new Map<
  string,
  {
    processor: TelemetryProcessor;
    scheduler: AgentScheduler;
    startedAt: number;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { attemptId, roomName, apiKey } = body;

    console.log("[API /livekit/agent/start] Request", {
      attemptId,
      roomName,
      hasApiKey: Boolean(apiKey),
    });

    // Validate required fields
    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json(
        { success: false, error: "Attempt ID is required" },
        { status: 400 }
      );
    }

    if (!roomName || typeof roomName !== "string") {
      return NextResponse.json(
        { success: false, error: "Room name is required" },
        { status: 400 }
      );
    }

    // Check if session is already active
    if (activeSessions.has(attemptId)) {
      console.log(`[Agent ${attemptId}] Session already active`);
      return NextResponse.json(
        { success: true, message: "Agent session already active" },
        { status: 200 }
      );
    }

    // Get agent token from Convex
    const tokenResult = await convex.action(api.livekit.createAgentToken, {
      attemptId,
      roomName,
    });

    if (!tokenResult.success) {
      console.warn(`[Agent ${attemptId}] Failed to create agent token`, {
        error: tokenResult.error,
      });
      return NextResponse.json(
        { success: false, error: tokenResult.error || "Failed to create agent token" },
        { status: 401 }
      );
    }

    console.log(`[Agent ${attemptId}] Agent token created`, {
      hasToken: Boolean(tokenResult.token),
      hasLivekitUrl: Boolean(tokenResult.livekitUrl),
    });

    let scoredWindowCount = 0;
    let lastScoreLogMs = 0;

    // Create telemetry processor
    const processor = new TelemetryProcessor({
      onWindowScored: (scores: WindowScore[]) => {
        scoredWindowCount += scores.length;
        const now = Date.now();
        if (now - lastScoreLogMs > 3000) {
          const lastWindowId = scores[scores.length - 1]?.windowId ?? null;
          console.log(
            `[Agent ${attemptId}] Scored ${scores.length} windows (total ${scoredWindowCount}, last ${lastWindowId})`
          );
          lastScoreLogMs = now;
        }
      },
      onSessionEnd: async (reason: string) => {
        console.log(`[Agent ${attemptId}] Session ended: ${reason}`);
        await cleanupSession(attemptId);
      },
    });

    // Connect processor to LiveKit room
    await processor.connect(
      tokenResult.livekitUrl!,
      tokenResult.token!,
      roomName,
      attemptId
    );

    console.log(`[Agent ${attemptId}] Processor connected to LiveKit`, {
      roomName,
    });

    // Create agent scheduler
    const scheduler = new AgentScheduler(processor, attemptId, {
      onDecision: async (result, sessionState) => {
        console.log(
          `[Agent ${attemptId}] Decision: ${result.decision} - ${result.reason}`
        );

        // Update Convex with agent state
        try {
          await convex.action(api.livekit.updateAttemptAgentState, {
            attemptId,
            agentState: {
              windowScores: sessionState.windowScores.map((w) => ({
                windowId: w.windowId,
                startMs: w.startMs,
                endMs: w.endMs,
                decision: w.decision,
                confidence: w.confidence,
                anomalyScore: w.anomalyScore,
              })),
              agentDecision: result.decision,
              agentReason: result.reason,
              decidedAt: Date.now(),
            },
          });
        } catch (error) {
          console.error(
            `[Agent ${attemptId}] Failed to update Convex:`,
            error
          );
        }

        // Cleanup session
        await cleanupSession(attemptId);
      },
    });

    // Start scheduler
    scheduler.start();

    // Store active session
    activeSessions.set(attemptId, {
      processor,
      scheduler,
      startedAt: Date.now(),
    });

    console.log(`[Agent] Started session for attempt ${attemptId}`);

    return NextResponse.json({
      success: true,
      attemptId,
      message: "Agent session started",
    });
  } catch (error) {
    console.error("[API /livekit/agent/start] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Cleanup an agent session
 */
async function cleanupSession(attemptId: string): Promise<void> {
  const session = activeSessions.get(attemptId);
  if (!session) return;

  activeSessions.delete(attemptId);

  try {
    session.scheduler.stop();
    await session.processor.disconnect();
  } catch (error) {
    console.error(`[Agent ${attemptId}] Cleanup error:`, error);
  }
  console.log(`[Agent] Cleaned up session for attempt ${attemptId}`);
}

/**
 * GET /api/livekit/agent/start
 *
 * Returns status of active agent sessions (for debugging)
 */
export async function GET() {
  const sessions = Array.from(activeSessions.entries()).map(
    ([attemptId, session]) => ({
      attemptId,
      startedAt: session.startedAt,
      elapsedMs: Date.now() - session.startedAt,
      isSchedulerActive: session.scheduler.isActive(),
    })
  );

  return NextResponse.json({
    activeSessions: sessions.length,
    sessions,
  });
}
