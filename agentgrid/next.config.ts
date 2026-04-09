import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - instrumentationHook exists at runtime but not in TS types
    instrumentationHook: true,
  },
};

export default nextConfig;
