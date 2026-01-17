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
        // Normalize results to check for pass/Human vs fail/Bot
        const passedSessions = sessions.filter((s) => s.result === "pass" || s.result === "Human").length;
        const botDetections = sessions.filter((s) => s.result === "fail" || s.result === "Bot").length;

        const humanPassRate = totalSessions > 0 ? passedSessions / totalSessions : 0;
        const avgSessionMs =
            totalSessions > 0
                ? sessions.reduce((acc, s) => acc + s.durationMs, 0) / totalSessions
                : 0;

        const completionRate = humanPassRate; // Simplified for now

        // Aggregations
        const byGame: Record<string, { count: number; passCount: number }> = {};
        const riskFlags: Record<string, number> = {};

        for (const s of sessions) {
            const game = s.gameId || s.minigameName;
            if (!byGame[game]) {
                byGame[game] = { count: 0, passCount: 0 };
            }
            byGame[game].count++;
            if (s.result === "pass" || s.result === "Human") {
                byGame[game].passCount++;
            }

            if (s.riskFlags) {
                for (const flag of s.riskFlags) {
                    riskFlags[flag] = (riskFlags[flag] || 0) + 1;
                }
            }
        }

        // Format byGame for frontend
        const byGameFormatted: Record<string, { count: number; passRate: number }> = {};
        for (const [game, data] of Object.entries(byGame)) {
            byGameFormatted[game] = {
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
            byGame: byGameFormatted,
            riskFlags,
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

/**
 * Get time series data for the analytics component
 */
export const timeSeries = query({
    args: { days: v.number() },
    handler: async (ctx, args) => {
        // In a real app with many records, you'd want to use an index on creation time
        // and aggregate more efficiently or pre-calculate. For now/demo, we scan.

        // We want to return data for the last N days
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        const startTime = now - (args.days * msPerDay);

        const sessions = await ctx.db
            .query("sessions")
            .filter((q) => q.gte(q.field("createdAt"), startTime))
            .collect();

        // Group by day
        const daysMap = new Map<string, { humans: number; bots: number; total: number }>();

        // Initialize all days to 0 to ensure continuous line
        for (let i = 0; i < args.days; i++) {
            const date = new Date(now - (i * msPerDay));
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            daysMap.set(dateStr, { humans: 0, bots: 0, total: 0 });
        }

        for (const s of sessions) {
            const dateStr = new Date(s.createdAt).toISOString().split('T')[0];
            // If the session is within our range (it might be slightly off due to timezone if not careful, 
            // but this is rough)
            if (!daysMap.has(dateStr)) continue;

            const entry = daysMap.get(dateStr)!;
            entry.total++;
            if (s.result === "pass" || s.result === "Human") {
                entry.humans++;
            } else {
                entry.bots++;
            }
        }

        // Convert map to sorted array
        const result = Array.from(daysMap.entries())
            .map(([date, data]) => ({
                date,
                ...data
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return result;
    },
});
