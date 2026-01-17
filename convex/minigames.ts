import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all minigames.
 */
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("minigames").collect();
    },
});

/**
 * Create a new minigame (for seeding/testing).
 */
export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        isReady: v.boolean(),
        brandingType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("minigames", {
            ...args,
            updatedAt: Date.now(),
            sessionIds: [],
        });
        return id;
    },
});
