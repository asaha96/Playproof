
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveBranding } from "./branding";

const brandingInput = v.object({
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    tertiaryColor: v.optional(v.string()),
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
