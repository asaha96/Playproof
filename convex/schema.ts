import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users table for storing user info synced from Clerk
    users: defineTable({
        clerkId: v.string(),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        // Branding fields
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
        tertiaryColor: v.optional(v.string()),
        typography: v.optional(v.string()),
        brandingType: v.optional(v.string()),
    }).index("by_clerk_id", ["clerkId"]),

    // Verification sessions table for analytics
    sessions: defineTable({
        userId: v.optional(v.string()),
        minigameName: v.string(),
        scorePercent: v.number(),
        result: v.union(v.literal("pass"), v.literal("fail")),
        durationMs: v.number(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Minigames configuration table
    minigames: defineTable({
        name: v.string(),
        slug: v.string(),
        description: v.optional(v.string()),
        isReady: v.boolean(),
        brandingType: v.optional(v.string()),
        sessionIds: v.optional(v.array(v.string())),
        updatedAt: v.number(),
    }).index("by_slug", ["slug"]),
});
