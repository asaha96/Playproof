/**
 * POST /api/query
 *
 * Proxies Convex queries for SDK clients.
 * This allows the SDK to call Convex queries (like getBrandingByCredentials)
 * without exposing Convex URL/credentials directly to the client.
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

// Create Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, args } = body;

    // Validate required fields
    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { success: false, error: "path is required" },
        { status: 400 }
      );
    }

    if (!args || typeof args !== "object") {
      return NextResponse.json(
        { success: false, error: "args is required" },
        { status: 400 }
      );
    }

    // Parse the path (e.g., "deployments:getBrandingByCredentials")
    const [module, functionName] = path.split(":");
    if (!module || !functionName) {
      return NextResponse.json(
        { success: false, error: "Invalid path format. Expected 'module:function'" },
        { status: 400 }
      );
    }

    // Map path to Convex API function
    // This is a dynamic lookup based on the path
    const apiModule = (api as any)[module];
    if (!apiModule) {
      return NextResponse.json(
        { success: false, error: `Module '${module}' not found` },
        { status: 404 }
      );
    }

    const apiFunction = apiModule[functionName];
    if (!apiFunction) {
      return NextResponse.json(
        { success: false, error: `Function '${functionName}' not found in module '${module}'` },
        { status: 404 }
      );
    }

    // Call Convex query
    const result = await convex.query(apiFunction, args);

    // Return result
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API /query] Error:", error);
    
    // Handle Convex errors
    if (error.message) {
      return NextResponse.json(
        { errorMessage: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
