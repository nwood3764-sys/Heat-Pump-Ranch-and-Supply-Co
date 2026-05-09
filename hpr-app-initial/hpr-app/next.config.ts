import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
      // Green Fiber product images
      {
        protocol: "https",
        hostname: "www.greenfiber.com",
      },
    ],
    // Optimize image delivery: use modern formats and reasonable cache
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24 hours
    // Limit image device sizes to reduce variants generated at build/runtime
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    // Tree-shake barrel exports from these packages for smaller bundles
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-popover", "@radix-ui/react-select", "@radix-ui/react-tabs"],
  },
  // Enable compression
  compress: true,
  // Power headers for performance
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, s-maxage=10, stale-while-revalidate=59" },
      ],
    },
  ],
  // Exclude heavy server-only packages from client bundles
  serverExternalPackages: ["playwright", "cheerio"],
};

export default nextConfig;
