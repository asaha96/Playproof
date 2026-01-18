import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const brandingFields = {
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  tertiaryColor: v.optional(v.string()),
  typography: v.optional(v.string()),
  brandingType: v.optional(v.string()),
};

export default defineSchema({
  // Users table - stores authenticated users from Clerk
  users: defineTable({
    // Clerk subject ID (unique identifier from Clerk)
    clerkSubject: v.string(),
    // User email
    email: v.string(),
    // Display name
    name: v.optional(v.string()),
    // Profile image URL (from Clerk or custom)
    imageUrl: v.optional(v.string()),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    ...brandingFields,
  })
    .index("by_clerkSubject", ["clerkSubject"])
    .index("by_email", ["email"]),

  // Minigames table - stores PlayProof minigame configs
  minigames: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    isReady: v.boolean(),
    sessionIds: v.optional(v.array(v.id("sessions"))),
    ...brandingFields,
  })
    .index("by_name", ["name"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_ready", ["isReady"]),

  // Sessions table - stores verification sessions for a minigame
  sessions: defineTable({
    minigameId: v.id("minigames"),
    
    // Core metrics (ESSENTIAL)
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    suspectScore: v.number(), // 0-1, bot likelihood
    
    // Game details (ESSENTIAL)
    gameId: v.optional(v.string()), // 'mini-golf', 'basketball', 'archery', 'bubble-pop'
    gameResult: v.optional(v.union(v.literal('success'), v.literal('failure'), v.literal('timeout'))),
    confidenceScore: v.optional(v.number()), // 0-1, how confident in result
    attemptDetails: v.optional(v.any()), // Game-specific JSON
    
    // Behavioral signals (ESSENTIAL)
    mouseMovements: v.optional(v.number()),
    clickCount: v.optional(v.number()),
    trajectoryCount: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    
    // User experience (ESSENTIAL)
    completionRate: v.optional(v.number()), // 0-1
    retryCount: v.optional(v.number()),
    
    // Risk signals (ESSENTIAL)
    riskFlags: v.optional(v.array(v.string())), // ['synthetic_cursor', 'repeat_latency', etc.]
    
    // Simplified client info (SIMPLIFIED - removed redundant fields)
    clientInfo: v.optional(
      v.object({
        userAgent: v.optional(v.string()), // Parse when needed
        ipAddress: v.optional(v.string()),
        country: v.optional(v.string()), // From location
        language: v.optional(v.string()),
      })
    ),
  })
    .index("by_minigameId", ["minigameId"])
    .index("by_startAt", ["startAt"])
    .index("by_gameId", ["gameId"])
    .index("by_suspectScore", ["suspectScore"]),
});
