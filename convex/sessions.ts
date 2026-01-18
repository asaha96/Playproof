import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const BOT_THRESHOLD = 0.5;

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
          deploymentName: deployment?.name ?? "Unknown deployment",
          suspectScore: session.suspectScore,
          scorePercent: Math.round(session.suspectScore * 100),
          startAt: session.startAt,
          endAt: session.endAt,
          durationMs: session.durationMs,
          result: session.suspectScore >= BOT_THRESHOLD ? "Bot" : "Human",
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
    const humanSessions = sessions.filter((s) => s.suspectScore < BOT_THRESHOLD).length;
    const botDetections = sessions.filter((s) => s.suspectScore >= BOT_THRESHOLD).length;

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
      if (s.suspectScore < BOT_THRESHOLD) {
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
 * Get time series data for the analytics component
 */
export const timeSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.days ?? 14;
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const startTime = now - days * msPerDay;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_startAt")
      .filter((q) => q.gte(q.field("startAt"), startTime))
      .collect();

    // Group by day
    const daysMap = new Map<string, { humans: number; bots: number; total: number }>();

    // Initialize all days to 0 to ensure continuous line
    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * msPerDay);
      const dateStr = date.toISOString().split("T")[0];
      daysMap.set(dateStr, { humans: 0, bots: 0, total: 0 });
    }

    for (const s of sessions) {
      const dateStr = new Date(s.startAt).toISOString().split("T")[0];
      if (!daysMap.has(dateStr)) continue;

      const entry = daysMap.get(dateStr)!;
      entry.total++;
      if (s.suspectScore < BOT_THRESHOLD) {
        entry.humans++;
      } else {
        entry.bots++;
      }
    }

    // Convert map to sorted array
    const result = Array.from(daysMap.entries())
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
    suspectScore: v.number(),
    clientInfo: v.optional(clientInfoInput),
  },
  handler: async (ctx, args) => {
    const deployment = await ctx.db.get(args.deploymentId);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const sessionId = await ctx.db.insert("sessions", {
      deploymentId: args.deploymentId,
      startAt: args.startAt,
      endAt: args.endAt,
      durationMs: args.durationMs,
      suspectScore: args.suspectScore,
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
