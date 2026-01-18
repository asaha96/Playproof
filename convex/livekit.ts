/**
 * LiveKit Realtime - Node.js Actions
 *
 * This module contains actions that require Node.js runtime
 * for the livekit-server-sdk package.
 */
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { AccessToken } from "livekit-server-sdk";
import { createHash } from "crypto";

// Attempt expiry TTL (30 minutes)
const ATTEMPT_TTL_MS = 30 * 60 * 1000;

/**
 * Generate a room name for an attempt
 */
function generateRoomName(deploymentId: string, attemptId: string): string {
  return `pp:${deploymentId}:${attemptId}`;
}

/**
 * Generate a UUID-like attempt ID
 */
function generateAttemptId(): string {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Hash an API key for auditing using SHA-256 (cryptographically secure)
 */
function hashApiKey(apiKey: string): string {
  const hash = createHash("sha256").update(apiKey).digest("hex");
  return `sha256_${hash.substring(0, 16)}`;
}

/**
 * Create a new verification attempt and return a publisher-only LiveKit token.
 * Called by the SDK when starting a verification.
 *
 * This is an action because it needs to use Node.js livekit-server-sdk.
 */
export const createAttemptAndPublisherToken = action({
  args: {
    apiKey: v.string(),
    deploymentId: v.id("deployments"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    livekitUrl?: string;
    token?: string;
    roomName?: string;
    attemptId?: string;
  }> => {
    // Get LiveKit credentials from environment
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return {
        success: false,
        error: "LiveKit not configured",
      };
    }

    // Validate API key by looking up user
    const user = await ctx.runQuery(internal.realtime.validateApiKey, { apiKey: args.apiKey });
    if (!user) {
      return {
        success: false,
        error: "Invalid API key",
      };
    }

    // Verify deployment exists
    const deployment = await ctx.runQuery(internal.realtime.getDeployment, { id: args.deploymentId });
    if (!deployment) {
      return {
        success: false,
        error: "Deployment not found",
      };
    }

    // Verify deployment belongs to the user (security check)
    if (deployment.userId && deployment.userId !== user._id) {
      return {
        success: false,
        // Use generic message to avoid leaking existence of other users' deployments
        error: "Deployment not found",
      };
    }

    // Generate attempt ID and room name
    const attemptId = generateAttemptId();
    const roomName = generateRoomName(args.deploymentId, attemptId);

    // Create LiveKit access token with publisher-only grants
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: `sdk_${attemptId}`,
      ttl: "30m",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: false, // SDK cannot subscribe (publisher-only)
    });

    const jwt = await token.toJwt();

    // Store the attempt in the database
    const now = Date.now();
    await ctx.runMutation(internal.realtime.insertAttemptInternal, {
      attemptId,
      deploymentId: args.deploymentId,
      userId: user._id,
      roomName,
      createdAt: now,
      expiresAt: now + ATTEMPT_TTL_MS,
      createdByApiKeyHash: hashApiKey(args.apiKey),
    });

    return {
      success: true,
      livekitUrl,
      token: jwt,
      roomName,
      attemptId,
    };
  },
});

/**
 * Create an observer token for dashboard subscribers.
 * This allows the dashboard to subscribe to telemetry streams.
 */
export const createObserverToken = action({
  args: {
    roomName: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    token?: string;
    livekitUrl?: string;
  }> => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Get LiveKit credentials from environment
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return {
        success: false,
        error: "LiveKit not configured",
      };
    }

    // Create LiveKit access token with subscriber-only grants
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: `observer_${identity.subject}`,
      ttl: "1h",
    });

    token.addGrant({
      room: args.roomName,
      roomJoin: true,
      canPublish: false, // Observer cannot publish
      canPublishData: false,
      canSubscribe: true, // Observer can subscribe to data
    });

    const jwt = await token.toJwt();

    return {
      success: true,
      token: jwt,
      livekitUrl,
    };
  },
});
