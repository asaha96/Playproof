import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Branding fields aligned with SDK PlayproofTheme interface
const brandingFields = {
  // Core colors
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  tertiaryColor: v.optional(v.string()),
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
  v.literal("osu"),
  v.literal("snake")
);

// Verification result decision type
const verificationDecision = v.union(
  v.literal("pass"),
  v.literal("review"),
  v.literal("fail")
);

export default defineSchema({
  // Active verification attempts (for LiveKit telemetry)
  activeAttempts: defineTable({
    attemptId: v.string(),
    deploymentId: v.id("deployments"),
    userId: v.id("users"), // Owner of the deployment (for access control)
    roomName: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    // Result from Woodwide scoring (set when attempt ends)
    result: v.optional(verificationDecision),
    anomalyScore: v.optional(v.number()),
    // Audit fields
    createdByApiKeyHash: v.optional(v.string()),
    // Real-time AI agent state (set by agent during session)
    agentState: v.optional(v.object({
      windowScores: v.array(v.object({
        windowId: v.number(),
        startMs: v.number(),
        endMs: v.number(),
        decision: v.union(v.literal("pass"), v.literal("review"), v.literal("fail")),
        confidence: v.number(),
        anomalyScore: v.number(),
      })),
      agentDecision: v.optional(v.union(v.literal("human"), v.literal("bot"))),
      agentReason: v.optional(v.string()),
      decidedAt: v.optional(v.number()),
    })),
  })
    .index("by_deploymentId", ["deploymentId"])
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_attemptId", ["attemptId"]),
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
    // Branding type (legacy field).
    // NOTE: This field is retained only for backward compatibility with
    // existing user records. New code should use the structured branding fields.
    brandingType: v.optional(v.string()),
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
    // Owner of the deployment (optional for backward compatibility with existing deployments)
    userId: v.optional(v.id("users")),
    // Unique deployment identifier for SDK lookup
    deploymentId: v.optional(v.string()),
    // API key for SDK authentication (format: pp_<32 chars>)
    apiKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isActive: v.boolean(),
    sessionIds: v.optional(v.array(v.id("sessions"))),
    ...brandingFields,
  })
    .index("by_name", ["name"])
    .index("by_userId", ["userId"])
    .index("by_updatedAt", ["updatedAt"])
    .index("by_active", ["isActive"])
    .index("by_apiKey", ["apiKey"])
    .index("by_deploymentId", ["deploymentId"]),
  // Sessions table - stores verification sessions for a deployment
  sessions: defineTable({
    deploymentId: v.id("deployments"),
    startAt: v.number(),
    endAt: v.number(),
    durationMs: v.number(),
    suspectScore: v.number(),
    // LLM's explicit pass/fail decision (when available from agent)
    llmPassed: v.optional(v.boolean()),
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
