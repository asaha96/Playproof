import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DEFAULT_BRANDING, resolveBranding } from "./branding";

const brandingInput = v.object({
  primaryColor: v.optional(v.string()),
  secondaryColor: v.optional(v.string()),
  tertiaryColor: v.optional(v.string()),
  typography: v.optional(v.string()),
  brandingType: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("minigames")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    isReady: v.optional(v.boolean()),
    branding: v.optional(brandingInput),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called create without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (q) => q.eq("clerkSubject", identity.subject))
      .unique();

    const userBranding = user
      ? {
          primaryColor: user.primaryColor,
          secondaryColor: user.secondaryColor,
          tertiaryColor: user.tertiaryColor,
          typography: user.typography,
          brandingType: user.brandingType,
        }
      : DEFAULT_BRANDING;

    const branding = resolveBranding(args.branding, userBranding);
    const now = Date.now();

    return await ctx.db.insert("minigames", {
      name: args.name,
      createdAt: now,
      updatedAt: now,
      isReady: args.isReady ?? false,
      sessionIds: [],
      ...branding,
    });
  },
});
