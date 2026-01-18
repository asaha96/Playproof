import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load env from monorepo root
config({ path: path.join(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
  /* config options here */
  // Transpile local workspace packages
  transpilePackages: ["playproof", "@playproof/shared"],
  turbopack: {
    // Set root to monorepo root so Turbopack can resolve modules correctly
    root: path.join(__dirname, "../.."),
    resolveAlias: {
      // Resolve @/convex to root convex folder
      "@/convex": path.join(__dirname, "../../convex"),
    },
  },
  // Enable type checking during build
  typescript: {
    // Enable type checking
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
