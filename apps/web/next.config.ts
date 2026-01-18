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
  },
};

export default nextConfig;
