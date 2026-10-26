import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baked into each build so open apps can tell when a newer version has been deployed.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}` },
};

export default nextConfig;
