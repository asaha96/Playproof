import { mutation, query } from "./_generated/server";

/**
 * Upsert the current authenticated user into the users table.
 * This is called when a user signs in via Clerk.
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
      if (identity.email && identity.email !== existingUser.email) {
        updates.email = identity.email;
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

/**
 * Get the current authenticated user
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
