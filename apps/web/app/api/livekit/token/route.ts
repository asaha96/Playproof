/**
 * POST /api/livekit/token
 *
 * Creates a LiveKit publisher token for SDK clients.
 * This proxies the request to Convex action with proper validation.
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

// Create Convex HTTP client (no auth needed - SDK uses API key)
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { apiKey, deploymentId } = body;

    // Validate required fields
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    if (!deploymentId || typeof deploymentId !== "string") {
      return NextResponse.json(
        { success: false, error: "Deployment ID is required" },
        { status: 400 }
      );
    }

    // Call Convex action to create attempt and get publisher token
    const result = await convex.action(api.livekit.createAttemptAndPublisherToken, {
      apiKey,
      deploymentId: deploymentId as Id<"deployments">,
    });

    // Forward the result (success or error)
    if (!result.success) {
      return NextResponse.json(result, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /livekit/token] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
