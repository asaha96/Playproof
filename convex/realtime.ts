/**
 * LiveKit Realtime - Queries and Mutations
 *
 * This module handles database operations for active attempts.
 * Actions that need Node.js (livekit-server-sdk) are in realtime.actions.ts
 */

import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";

// LiveKit topics for telemetry
export const TELEMETRY_TOPICS = {
  POINTER_V1: "playproof.pointer.v1",
} as const;

/**
 * Internal query to validate API key (used by actions)
 */
export const validateApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
    };
  },
});

/**
 * Internal query to get deployment (used by actions)
 */
export const getDeployment = internalQuery({
  args: {
    id: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Internal mutation to insert an attempt record (used by actions)
 */
export const insertAttemptInternal = internalMutation({
  args: {
    attemptId: v.string(),
    deploymentId: v.id("deployments"),
    userId: v.id("users"),
    roomName: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    createdByApiKeyHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activeAttempts", {
      attemptId: args.attemptId,
      deploymentId: args.deploymentId,
      userId: args.userId,
      roomName: args.roomName,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      createdByApiKeyHash: args.createdByApiKeyHash,
    });
  },
});

/**
 * List active (non-expired) attempts for the authenticated dashboard user.
 * Only shows attempts for deployments owned by the authenticated user.
 */
export const listActiveAttempts = query({
  args: {
    deploymentId: v.optional(v.id("deployments")),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user to filter by userId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const now = Date.now();

    // Query attempts filtered by user
    let attempts;
    if (args.deploymentId) {
      attempts = await ctx.db
        .query("activeAttempts")
        .withIndex("by_deploymentId", (q) => q.eq("deploymentId", args.deploymentId!))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();
    } else {
      attempts = await ctx.db
        .query("activeAttempts")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();
    }

    // Filter out expired attempts and enrich with deployment info
    const activeAttempts = await Promise.all(
      attempts
        .filter((a) => a.expiresAt > now)
        .map(async (attempt) => {
          const deployment = await ctx.db.get(attempt.deploymentId);
          return {
            _id: attempt._id,
            attemptId: attempt.attemptId,
            deploymentId: attempt.deploymentId,
            deploymentName: deployment?.name ?? "Unknown",
            roomName: attempt.roomName,
            createdAt: attempt.createdAt,
            expiresAt: attempt.expiresAt,
            result: attempt.result ?? null,
            anomalyScore: attempt.anomalyScore ?? null,
          };
        })
    );

    // Sort by createdAt descending (most recent first)
    return activeAttempts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * List recent attempts with their results (for dashboard display)
 * Only shows attempts for deployments owned by the authenticated user.
 */
export const listRecentAttemptsWithResults = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user to filter by userId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get attempts filtered by user (using index for efficiency)
    const attempts = await ctx.db
      .query("activeAttempts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(limit * 2); // Take more to account for filtering

    // Enrich with deployment info and sort
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        const deployment = await ctx.db.get(attempt.deploymentId);
        return {
          _id: attempt._id,
          attemptId: attempt.attemptId,
          deploymentId: attempt.deploymentId,
          deploymentName: deployment?.name ?? "Unknown",
          deploymentType: deployment?.type,
          createdAt: attempt.createdAt,
          result: attempt.result ?? null,
          anomalyScore: attempt.anomalyScore ?? null,
        };
      })
    );

    // Sort by createdAt descending and take limit
    return enrichedAttempts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

/**
 * Update an attempt with its result after Woodwide scoring
 * This is an internal mutation - only called by the backend API, not directly by clients.
 */
export const updateAttemptResult = internalMutation({
  args: {
    attemptId: v.string(),
    result: v.union(v.literal("pass"), v.literal("review"), v.literal("fail")),
    anomalyScore: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the attempt
    const attempt = await ctx.db
      .query("activeAttempts")
      .withIndex("by_attemptId", (q) => q.eq("attemptId", args.attemptId))
      .first();

    if (!attempt) {
      throw new Error("Attempt not found");
    }

    // Update with result
    await ctx.db.patch(attempt._id, {
      result: args.result,
      anomalyScore: args.anomalyScore,
    });
  },
});

/**
 * Cleanup expired attempts (can be called periodically by authenticated users or scheduled jobs)
 * Requires authentication - only allows cleaning up attempts for the user's own deployments.
 */
export const cleanupExpiredAttempts = mutation({
  args: {},
  handler: async (ctx) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { deleted: 0 };
    }

    const now = Date.now();

    // Only get expired attempts for this user's deployments
    const expiredAttempts = await ctx.db
      .query("activeAttempts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deleted = 0;
    for (const attempt of expiredAttempts) {
      await ctx.db.delete(attempt._id);
      deleted++;
    }

    return { deleted };
  },
});
