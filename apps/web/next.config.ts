import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Set root to monorepo root so Turbopack can resolve modules correctly
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
