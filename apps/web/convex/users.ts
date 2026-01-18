import { mutation, query } from "./_generated/server";

/**
 * Generate a random API key with the format: pp_<32 alphanumeric chars>
 */
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "pp_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

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

    // Check if user already exists (try both clerkId and clerkSubject for compatibility)
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!existingUser) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
        .unique();
    }

    const now = Date.now();

    if (existingUser) {
      // Update existing user if name or image changed
      const updates: Record<string, unknown> = { updatedAt: now };

      // Ensure both clerkId and clerkSubject are set for compatibility
      if (!existingUser.clerkId) {
        updates.clerkId = identity.subject;
      }
      if (!existingUser.clerkSubject) {
        updates.clerkSubject = identity.subject;
      }

      // Generate API key if user doesn't have one
      if (!existingUser.apiKey) {
        updates.apiKey = generateApiKey();
      }

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

    // Create new user with both clerkId and clerkSubject for compatibility
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      clerkSubject: identity.subject,
      email: identity.email || "",
      name: identity.name || identity.email?.split("@")[0] || "User",
      imageUrl: identity.pictureUrl,
      apiKey: generateApiKey(),
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

    // Try both indexes for compatibility
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
        .unique();
    }

    return user;
  },
});

/**
 * Get the current user's API key
 */
export const getApiKey = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Try both indexes for compatibility
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
        .unique();
    }

    return user?.apiKey ?? null;
  },
});

/**
 * Regenerate the current user's API key
 */
export const regenerateApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called regenerateApiKey without authentication");
    }

    // Try both indexes for compatibility
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
        .unique();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const newApiKey = generateApiKey();
    await ctx.db.patch(user._id, {
      apiKey: newApiKey,
      updatedAt: Date.now(),
    });

    return newApiKey;
  },
});
