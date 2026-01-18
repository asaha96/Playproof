import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveBranding } from "./branding";

// Branding input aligned with SDK PlayproofTheme interface
const brandingInput = v.object({
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
});

const deploymentType = v.union(
  v.literal("bubble-pop"),
  v.literal("golf"),
  v.literal("basketball"),
  v.literal("archery")
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("deployments")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    id: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: deploymentType,
    isActive: v.optional(v.boolean()),
    branding: v.optional(brandingInput),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called create without authentication");
    }

    const branding = resolveBranding(args.branding);
    const now = Date.now();

    return await ctx.db.insert("deployments", {
      name: args.name,
      type: args.type,
      createdAt: now,
      updatedAt: now,
      isActive: args.isActive ?? false,
      sessionIds: [],
      ...branding,
    });
  },
});

export const setActive = mutation({
  args: {
    id: v.id("deployments"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called setActive without authentication");
    }

    const deployment = await ctx.db.get(args.id);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("deployments"),
    name: v.string(),
    type: deploymentType,
    isActive: v.boolean(),
    branding: v.optional(brandingInput),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called update without authentication");
    }

    const deployment = await ctx.db.get(args.id);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const branding = resolveBranding(args.branding);

    await ctx.db.patch(args.id, {
      name: args.name,
      type: args.type,
      isActive: args.isActive,
      updatedAt: Date.now(),
      ...branding,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called remove without authentication");
    }

    const deployment = await ctx.db.get(args.id);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    await ctx.db.delete(args.id);
  },
});
