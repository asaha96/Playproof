import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveBranding } from "./branding";

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
 * Generate a deployment ID slug from the name (lowercase, no spaces)
 */
function generateDeploymentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

    // Generate API key and deployment ID slug
    const apiKey = generateApiKey();
    const deploymentId = generateDeploymentId(args.name);

    // Ensure deploymentId is unique
    const existing = await ctx.db
      .query("deployments")
      .withIndex("by_deploymentId", (q) => q.eq("deploymentId", deploymentId))
      .first();

    if (existing) {
      throw new Error(`Deployment ID "${deploymentId}" already exists. Please use a different name.`);
    }

    return await ctx.db.insert("deployments", {
      name: args.name,
      type: args.type,
      deploymentId,
      apiKey,
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

/**
 * Backfill missing API credentials for deployments created before these fields were added.
 * This mutation generates apiKey and deploymentId if they don't exist.
 */
export const backfillCredentials = mutation({
  args: {
    id: v.id("deployments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called backfillCredentials without authentication");
    }

    const deployment = await ctx.db.get(args.id);
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const updates: { apiKey?: string; deploymentId?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    // Generate API key if missing
    if (!deployment.apiKey) {
      updates.apiKey = generateApiKey();
    }

    // Generate deployment ID if missing
    if (!deployment.deploymentId) {
      const deploymentId = generateDeploymentId(deployment.name);

      // Ensure deploymentId is unique
      const existing = await ctx.db
        .query("deployments")
        .withIndex("by_deploymentId", (q) => q.eq("deploymentId", deploymentId))
        .first();

      if (existing && existing._id !== args.id) {
        // Add a random suffix to make it unique
        updates.deploymentId = `${deploymentId}-${Math.random().toString(36).substring(2, 8)}`;
      } else {
        updates.deploymentId = deploymentId;
      }
    }

    // Only update if there are missing fields
    if (updates.apiKey || updates.deploymentId) {
      await ctx.db.patch(args.id, updates);
    }

    return {
      apiKey: updates.apiKey || deployment.apiKey,
      deploymentId: updates.deploymentId || deployment.deploymentId,
    };
  },
});

/**
 * Public query for SDK to fetch deployment branding by API key and deployment ID.
 * This does not require authentication - credentials are validated via apiKey match.
 */
export const getBrandingByCredentials = query({
  args: {
    apiKey: v.string(),
    deploymentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find deployment by deploymentId
    const deployment = await ctx.db
      .query("deployments")
      .withIndex("by_deploymentId", (q) => q.eq("deploymentId", args.deploymentId))
      .first();

    if (!deployment) {
      return { error: "Deployment not found" };
    }

    // Validate API key
    if (deployment.apiKey !== args.apiKey) {
      return { error: "Invalid API key" };
    }

    // Return branding settings mapped to SDK theme format
    return {
      success: true,
      theme: {
        primary: deployment.primaryColor,
        secondary: deployment.secondaryColor,
        background: deployment.backgroundColor,
        surface: deployment.surfaceColor,
        text: deployment.textColor,
        textMuted: deployment.textMutedColor,
        accent: deployment.accentColor,
        success: deployment.successColor,
        error: deployment.errorColor,
        border: deployment.borderColor,
      },
      gameId: deployment.type,
    };
  },
});
