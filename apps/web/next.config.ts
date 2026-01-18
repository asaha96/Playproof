import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load env from monorepo root
config({ path: path.join(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Set root to monorepo root so Turbopack can resolve modules correctly
    root: path.join(__dirname, "../.."),
    resolveAlias: {
      // Resolve @/convex to root convex folder
      "@/convex": path.join(__dirname, "../../convex"),
    },
  },
  // Skip type checking during build (handled separately)
  typescript: {
    // The root convex folder has its own tsconfig and is type-checked separately
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
