/**
 * LiveKit Realtime - Queries and Mutations
 *
 * This module handles database operations for active attempts.
 * Actions that need Node.js (livekit-server-sdk) are in realtime.actions.ts
 */

import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";

// Attempt expiry TTL (30 minutes)
const ATTEMPT_TTL_MS = 30 * 60 * 1000;

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
    roomName: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    createdByApiKeyHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activeAttempts", {
      attemptId: args.attemptId,
      deploymentId: args.deploymentId,
      roomName: args.roomName,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      createdByApiKeyHash: args.createdByApiKeyHash,
    });
  },
});

/**
 * List active (non-expired) attempts for the authenticated dashboard user.
 * Only shows attempts for deployments - intended for dashboard observation.
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

    const now = Date.now();

    // Query attempts, optionally filtered by deployment
    let attempts;
    if (args.deploymentId) {
      attempts = await ctx.db
        .query("activeAttempts")
        .withIndex("by_deploymentId", (q) => q.eq("deploymentId", args.deploymentId!))
        .collect();
    } else {
      attempts = await ctx.db.query("activeAttempts").collect();
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

    const limit = args.limit ?? 50;

    // Get all attempts (including expired)
    const attempts = await ctx.db.query("activeAttempts").collect();

    // Enrich with deployment info and sort
    const enrichedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        const deployment = await ctx.db.get(attempt.deploymentId);
        return {
          _id: attempt._id,
          attemptId: attempt.attemptId,
          deploymentId: attempt.deploymentId,
          deploymentName: deployment?.name ?? "Unknown",
          deploymentType: deployment?.type ?? "unknown",
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
 */
export const updateAttemptResult = mutation({
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
 * Cleanup expired attempts (can be called periodically)
 */
export const cleanupExpiredAttempts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredAttempts = await ctx.db
      .query("activeAttempts")
      .withIndex("by_expiresAt")
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
