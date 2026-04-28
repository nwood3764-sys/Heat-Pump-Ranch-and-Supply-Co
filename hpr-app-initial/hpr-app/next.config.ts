import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lghvac.com",
      },
      {
        protocol: "https",
        hostname: "www.lg.com",
      },
      // ACIQ images will be migrated to Supabase Storage by the sync layer.
      // The portal hostname is allowed only as a transitional fallback.
      {
        protocol: "https",
        hostname: "portal.aciq.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
