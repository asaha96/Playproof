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
        const minigame = await ctx.db.get(session.minigameId);
        return {
          _id: session._id,
          minigameId: session.minigameId,
          minigameName: minigame?.name ?? "Unknown minigame",
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

    return {
      totalSessions: sessions.length,
      humanPassRate,
      botDetections,
      avgSessionMs: totalDuration / sessions.length,
    };
  },
});

export const create = mutation({
  args: {
    minigameId: v.id("minigames"),
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    suspectScore: v.number(),
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
