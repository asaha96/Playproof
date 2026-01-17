import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const BOT_THRESHOLD = 0.5;

const clientInfoInput = v.object({
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  country: v.optional(v.string()),
  language: v.optional(v.string()),
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
        const minigame = await ctx.db.get(session.minigameId);
        return {
          _id: session._id,
          minigameId: session.minigameId,
          minigameName: minigame?.name ?? "Unknown minigame",
          gameId: session.gameId ?? "unknown",
          suspectScore: session.suspectScore,
          scorePercent: Math.round(session.suspectScore * 100),
          confidenceScore: session.confidenceScore,
          startAt: session.startAt,
          endAt: session.endAt,
          durationMs: session.durationMs,
          gameResult: session.gameResult,
          result: session.suspectScore >= BOT_THRESHOLD ? "Bot" : "Human",
          riskFlags: session.riskFlags ?? [],
        };
      })
    );

    return results;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        humanPassRate: 0,
        botDetections: 0,
        avgSessionMs: 0,
        avgConfidence: 0,
        completionRate: 0,
        byGame: {},
        riskFlags: {},
      };
    }

    const botDetections = sessions.filter(
      (session) => session.suspectScore >= BOT_THRESHOLD
    ).length;
    const humanPassRate =
      (sessions.length - botDetections) / sessions.length;
    const totalDuration = sessions.reduce(
      (sum, session) => sum + session.durationMs,
      0
    );
    const avgConfidence = sessions.reduce(
      (sum, session) => sum + (session.confidenceScore ?? 0.5),
      0
    ) / sessions.length;
    const completedSessions = sessions.filter(
      (session) => session.gameResult === 'success'
    ).length;
    const completionRate = completedSessions / sessions.length;

    // Group by game
    const byGame: Record<string, { count: number; passRate: number }> = {};
    sessions.forEach((session) => {
      const gameId = session.gameId ?? "unknown";
      if (!byGame[gameId]) {
        byGame[gameId] = { count: 0, passRate: 0 };
      }
      byGame[gameId].count++;
      if (session.suspectScore < BOT_THRESHOLD) {
        byGame[gameId].passRate++;
      }
    });
    Object.keys(byGame).forEach((gameId) => {
      byGame[gameId].passRate = byGame[gameId].passRate / byGame[gameId].count;
    });

    // Aggregate risk flags
    const riskFlags: Record<string, number> = {};
    sessions.forEach((session) => {
      (session.riskFlags ?? []).forEach((flag) => {
        riskFlags[flag] = (riskFlags[flag] || 0) + 1;
      });
    });

    return {
      totalSessions: sessions.length,
      humanPassRate,
      botDetections,
      avgSessionMs: totalDuration / sessions.length,
      avgConfidence,
      completionRate,
      byGame,
      riskFlags,
    };
  },
});

export const timeSeries = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 14;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_startAt")
      .filter((q) => q.gte(q.field("startAt"), cutoff))
      .collect();

    // Group by day
    const daily: Record<string, { date: string; humans: number; bots: number; total: number }> = {};
    
    sessions.forEach((session) => {
      const date = new Date(session.startAt).toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { date, humans: 0, bots: 0, total: 0 };
      }
      daily[date].total++;
      if (session.suspectScore >= BOT_THRESHOLD) {
        daily[date].bots++;
      } else {
        daily[date].humans++;
      }
    });

    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const create = mutation({
  args: {
    minigameId: v.id("minigames"),
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    suspectScore: v.number(),
    gameId: v.optional(v.string()),
    gameResult: v.optional(v.union(v.literal('success'), v.literal('failure'), v.literal('timeout'))),
    confidenceScore: v.optional(v.number()),
    attemptDetails: v.optional(v.any()),
    mouseMovements: v.optional(v.number()),
    clickCount: v.optional(v.number()),
    trajectoryCount: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    completionRate: v.optional(v.number()),
    retryCount: v.optional(v.number()),
    riskFlags: v.optional(v.array(v.string())),
    clientInfo: v.optional(clientInfoInput),
  },
  handler: async (ctx, args) => {
    const minigame = await ctx.db.get(args.minigameId);
    if (!minigame) {
      throw new Error("Minigame not found");
    }

    const sessionId = await ctx.db.insert("sessions", {
      minigameId: args.minigameId,
      startAt: args.startAt,
      endAt: args.endAt,
      durationMs: args.durationMs,
      suspectScore: args.suspectScore,
      gameId: args.gameId,
      gameResult: args.gameResult,
      confidenceScore: args.confidenceScore,
      attemptDetails: args.attemptDetails,
      mouseMovements: args.mouseMovements,
      clickCount: args.clickCount,
      trajectoryCount: args.trajectoryCount,
      accuracy: args.accuracy,
      completionRate: args.completionRate,
      retryCount: args.retryCount,
      riskFlags: args.riskFlags,
      clientInfo: args.clientInfo,
    });

    const sessionIds = minigame.sessionIds ?? [];
    await ctx.db.patch(args.minigameId, {
      sessionIds: [...sessionIds, sessionId],
      updatedAt: Date.now(),
    });

    return sessionId;
  },
});
