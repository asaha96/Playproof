import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  })
    .index("by_clerkSubject", ["clerkSubject"])
    .index("by_email", ["email"]),
});
