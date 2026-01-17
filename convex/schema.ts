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
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    suspectScore: v.number(),
    clientInfo: v.optional(
      v.object({
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
      })
    ),
  })
    .index("by_minigameId", ["minigameId"])
    .index("by_startAt", ["startAt"]),
});
