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
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (existingUser) {
            // Update existing user
            await ctx.db.patch(existingUser._id, {
                email: identity.email,
                name: identity.name,
                imageUrl: identity.pictureUrl,
            });
            return existingUser._id;
        }

        // Create new user
        const userId = await ctx.db.insert("users", {
            clerkId: identity.subject,
            email: identity.email,
            name: identity.name,
            imageUrl: identity.pictureUrl,
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
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
            .unique();

        return user;
    },
});
