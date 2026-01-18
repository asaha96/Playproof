/**
 * POST /api/attempts/result
 *
 * Updates an attempt with its Woodwide scoring result.
 * This is called by the backend scoring API (apps/api) after processing telemetry.
 * 
 * Requires an internal API key for authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

// Create Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Internal API key for server-to-server communication
const INTERNAL_API_KEY = process.env.PLAYPROOF_INTERNAL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = request.headers.get("Authorization");
    const providedKey = authHeader?.replace("Bearer ", "");
    
    if (!INTERNAL_API_KEY || providedKey !== INTERNAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attemptId, result, anomalyScore } = body;

    // Validate required fields
    if (!attemptId || typeof attemptId !== "string") {
      return NextResponse.json(
        { success: false, error: "attemptId is required" },
        { status: 400 }
      );
    }

    if (!result || !["pass", "review", "fail"].includes(result)) {
      return NextResponse.json(
        { success: false, error: "result must be 'pass', 'review', or 'fail'" },
        { status: 400 }
      );
    }

    if (typeof anomalyScore !== "number") {
      return NextResponse.json(
        { success: false, error: "anomalyScore must be a number" },
        { status: 400 }
      );
    }

    // Call Convex internal mutation via scheduled mutation or HTTP action
    // Note: We need to use an internal action to call internal mutations
    // For now, we'll create a public action wrapper for this
    await convex.mutation(api.realtime.updateAttemptResultPublic, {
      attemptId,
      result: result as "pass" | "review" | "fail",
      anomalyScore,
      internalApiKey: providedKey,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API /attempts/result] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
