import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get aggregated statistics for the analytics dashboard
 */
export const stats = query({
    args: {},
    handler: async (ctx) => {
        const sessions = await ctx.db.query("sessions").collect();

        const totalSessions = sessions.length;
        const passedSessions = sessions.filter((s) => s.result === "pass").length;
        const botDetections = sessions.filter((s) => s.result === "fail").length;

        const humanPassRate = totalSessions > 0 ? passedSessions / totalSessions : 0;
        const avgSessionMs =
            totalSessions > 0
                ? sessions.reduce((acc, s) => acc + s.durationMs, 0) / totalSessions
                : 0;

        return {
            totalSessions,
            humanPassRate,
            botDetections,
            avgSessionMs,
        };
    },
});

/**
 * Get recent verification sessions
 */
export const recent = query({
    args: { limit: v.number() },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("sessions")
            .order("desc")
            .take(args.limit);

        return sessions;
    },
});
