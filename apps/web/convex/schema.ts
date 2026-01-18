import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Branding fields aligned with SDK PlayproofTheme interface
const brandingFields = {
  // Core colors
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  backgroundColor: v.optional(v.string()),
  surfaceColor: v.optional(v.string()),
  // Text colors
  textColor: v.optional(v.string()),
  textMutedColor: v.optional(v.string()),
  // UI colors
  accentColor: v.optional(v.string()),
  successColor: v.optional(v.string()),
  errorColor: v.optional(v.string()),
  borderColor: v.optional(v.string()),
  // Layout
  borderRadius: v.optional(v.number()),
  spacing: v.optional(v.number()),
  // Typography
  typography: v.optional(v.string()),
};

const deploymentType = v.union(
  v.literal("bubble-pop"),
  v.literal("archery"),
  v.literal("osu")
);

export default defineSchema({
  // Users table - stores authenticated users from Clerk
  users: defineTable({
    // Clerk identifiers (support both for migration compatibility)
    clerkId: v.optional(v.string()),
    clerkSubject: v.optional(v.string()),
    // User email
    email: v.optional(v.string()),
    // Display name
    name: v.optional(v.string()),
    // Profile image URL (from Clerk or custom)
    imageUrl: v.optional(v.string()),
    // API key for SDK authentication (format: pp_<32 chars>)
    apiKey: v.optional(v.string()),
    // Timestamps
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    // Branding fields (user-level customization)
    ...brandingFields,
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_clerkSubject", ["clerkSubject"])
    .index("by_email", ["email"])
    .index("by_apiKey", ["apiKey"]),
  // Deployments table - stores PlayProof deployment configs
  deployments: defineTable({
    name: v.string(),
    type: deploymentType,
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
    sessionIds: v.optional(v.array(v.id("sessions"))),
    ...brandingFields,
  })
    .index("by_name", ["name"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_active", ["isActive"]),
  // Sessions table - stores verification sessions for a deployment
  sessions: defineTable({
    deploymentId: v.id("deployments"),
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
    .index("by_deploymentId", ["deploymentId"])
    .index("by_startAt", ["startAt"]),
});
