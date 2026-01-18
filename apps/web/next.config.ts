import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load env from monorepo root
config({ path: path.join(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
  /* config options here */
  // Transpile local workspace packages
  transpilePackages: ["playproof", "@playproof/shared"],
  serverExternalPackages: ["@livekit/rtc-node"],
  turbopack: {
    // Set root to monorepo root so Turbopack can resolve modules correctly
    root: path.join(__dirname, "../.."),
    resolveAlias: {
      // Resolve @/convex to root convex folder
      "@/convex": path.join(__dirname, "../../convex"),
    },
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },
  // Enable type checking during build
  typescript: {
    // Enable type checking
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        // match the api route
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // replace this your actual origin
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },
};

export default nextConfig;
