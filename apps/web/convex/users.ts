import { mutation, query } from "./_generated/server";

/**
 * Get the current authenticated user's data.
 * Returns null if not authenticated or user doesn't exist in DB yet.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
      .unique();

    return user;
  },
});

/**
 * Check if the current user is authenticated (has valid Clerk session).
 */
export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.auth.getUserIdentity()) !== null;
  },
});

/**
 * Upsert (create or update) the current user in the database.
 * Call this after sign-in to ensure the user exists in Convex.
 */
export const upsertViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called upsertViewer without authentication");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
      .unique();

    const now = Date.now();

    if (existingUser) {
      // Update existing user if name or image changed
      const updates: Record<string, unknown> = { updatedAt: now };
      
      if (identity.name && identity.name !== existingUser.name) {
        updates.name = identity.name;
      }
      if (identity.pictureUrl && identity.pictureUrl !== existingUser.imageUrl) {
        updates.imageUrl = identity.pictureUrl;
      }

      if (Object.keys(updates).length > 1) {
        await ctx.db.patch(existingUser._id, updates);
      }

      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkSubject: identity.subject,
      email: identity.email || "",
      name: identity.name || identity.email?.split("@")[0] || "User",
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });

    return userId;
  },
});
