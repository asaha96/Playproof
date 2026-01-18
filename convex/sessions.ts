import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const clientInfoInput = v.object({
  deviceType: v.optional(v.string()),
  deviceVendor: v.optional(v.string()),
  deviceModel: v.optional(v.string()),
  browserName: v.optional(v.string()),
  browserVersion: v.optional(v.string()),
  osName: v.optional(v.string()),
  osVersion: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  language: v.optional(v.string()),
  location: v.optional(
    v.object({
      country: v.optional(v.string()),
      region: v.optional(v.string()),
      city: v.optional(v.string()),
      timezone: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
    })
  ),
  requestHeaders: v.optional(
    v.array(v.object({ name: v.string(), value: v.string() }))
  ),
  cookies: v.optional(
    v.array(v.object({ name: v.string(), value: v.string() }))
  ),
});

const sessionResultInput = v.union(v.literal("human"), v.literal("bot"));

export const recent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_startAt")
      .order("desc")
      .take(limit);

    const results = await Promise.all(
      sessions.map(async (session) => {
        const deployment = await ctx.db.get(session.deploymentId);
        return {
          _id: session._id,
          deploymentId: session.deploymentId,
          deploymentName: session.deploymentName ?? deployment?.name ?? "Unknown deployment",
          startAt: session.startAt,
          endAt: session.endAt,
          durationMs: session.durationMs,
          result: session.result,
        };
      })
    );

    return results;
  },
});

/**
 * Get aggregated statistics for the analytics dashboard
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();

    const totalSessions = sessions.length;
    const humanSessions = sessions.filter((s) => s.result === "human").length;
    const botDetections = sessions.filter((s) => s.result === "bot").length;

    const humanPassRate = totalSessions > 0 ? humanSessions / totalSessions : 0;
    const avgSessionMs =
      totalSessions > 0
        ? sessions.reduce((acc, s) => acc + s.durationMs, 0) / totalSessions
        : 0;

    const completionRate = humanPassRate;

    // Aggregate by deployment
    const byDeployment: Record<string, { count: number; passCount: number }> = {};

    for (const s of sessions) {
      const deploymentId = s.deploymentId.toString();
      if (!byDeployment[deploymentId]) {
        byDeployment[deploymentId] = { count: 0, passCount: 0 };
      }
      byDeployment[deploymentId].count++;
      if (s.result === "human") {
        byDeployment[deploymentId].passCount++;
      }
    }

    // Format byDeployment for frontend
    const byDeploymentFormatted: Record<string, { count: number; passRate: number }> = {};
    for (const [deploymentId, data] of Object.entries(byDeployment)) {
      byDeploymentFormatted[deploymentId] = {
        count: data.count,
        passRate: data.count > 0 ? data.passCount / data.count : 0,
      };
    }

    return {
      totalSessions,
      humanPassRate,
      botDetections,
      avgSessionMs,
      completionRate,
      byDeployment: byDeploymentFormatted,
    };
  },
});

/**
 * Get time series data for the analytics component (24 hours, hourly granularity)
 */
export const timeSeries = query({
  args: { 
    days: v.optional(v.float64()),
    hours: v.optional(v.float64()), // Backwards compatibility
  },
  handler: async (ctx, args) => {
    // Accept either days or hours (hours takes precedence if both provided)
    const days = args.hours ? args.hours / 24 : (args.days ?? 1);
    const now = Date.now();
    const msPerHour = 60 * 60 * 1000;
    const hours = Math.round(days * 24);
    const startTime = now - hours * msPerHour;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_startAt")
      .filter((q) => q.gte(q.field("startAt"), startTime))
      .collect();

    // Group by hour
    const hoursMap = new Map<string, { humans: number; bots: number; total: number }>();

    // Initialize all hours to 0 to ensure continuous line
    for (let i = 0; i < hours; i++) {
      const date = new Date(now - i * msPerHour);
      // Format as "HH:00" for hour buckets
      const hourStr = date.toISOString().slice(0, 13); // e.g., "2026-01-18T07"
      hoursMap.set(hourStr, { humans: 0, bots: 0, total: 0 });
    }

    for (const s of sessions) {
      const hourStr = new Date(s.startAt).toISOString().slice(0, 13);
      if (!hoursMap.has(hourStr)) continue;

      const entry = hoursMap.get(hourStr)!;
      entry.total++;
      if (s.result === "human") {
        entry.humans++;
      } else {
        entry.bots++;
      }
    }

    // Convert map to sorted array
    const result = Array.from(hoursMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  },
});

export const create = mutation({
  args: {
    deploymentId: v.id("deployments"),
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    result: sessionResultInput,
    clientInfo: v.optional(clientInfoInput),
  },
  handler: async (ctx, args) => {
    const deployment = await ctx.db.get(args.deploymentId);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const sessionId = await ctx.db.insert("sessions", {
      deploymentId: args.deploymentId,
      deploymentName: deployment.name,
      startAt: args.startAt,
      endAt: args.endAt,
      durationMs: args.durationMs,
      result: args.result,
      clientInfo: args.clientInfo,
    });

    const sessionIds = deployment.sessionIds ?? [];
    await ctx.db.patch(args.deploymentId, {
      sessionIds: [...sessionIds, sessionId],
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});

/**
 * Public mutation for SDK to record sessions using API key authentication.
 * This allows the SDK to report verification results without Clerk auth.
 */
export const createWithApiKey = mutation({
  args: {
    apiKey: v.string(),
    deploymentId: v.id("deployments"),
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    result: sessionResultInput,
  },
  handler: async (ctx, args) => {
    // Validate API key against users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_apiKey", (q) => q.eq("apiKey", args.apiKey))
      .first();

    if (!user) {
      throw new Error("Invalid API key");
    }

    // Get deployment and verify it exists
    const deployment = await ctx.db.get(args.deploymentId);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    // Optionally verify the user owns this deployment
    if (deployment.userId && deployment.userId !== user._id) {
      throw new Error("API key does not have access to this deployment");
    }

    // Create the session
    const sessionId = await ctx.db.insert("sessions", {
      deploymentId: args.deploymentId,
      deploymentName: deployment.name,
      startAt: args.startAt,
      endAt: args.endAt,
      durationMs: args.durationMs,
      result: args.result,
    });

    // Update deployment's session list
    const sessionIds = deployment.sessionIds ?? [];
    await ctx.db.patch(args.deploymentId, {
      sessionIds: [...sessionIds, sessionId],
      updatedAt: Date.now(),
    });

    return { success: true, sessionId };
  },
});
