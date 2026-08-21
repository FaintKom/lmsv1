import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // SAT practice retired from the product surface (2026-08-02, owner
      // decision). The engine stays in components/sat/* and the store; only
      // the routes and nav entries are gone.
      { source: "/sat-practice", destination: "/dashboard", permanent: false },
      { source: "/sat-practice/:path*", destination: "/dashboard", permanent: false },
      // Jitsi left the product (specs/033). Live lessons and their recordings
      // now share one page, so all three retired addresses land there.
      { source: "/admin/meetings", destination: "/admin/live", permanent: false },
      { source: "/admin/recordings", destination: "/admin/live", permanent: false },
      { source: "/meetings", destination: "/live", permanent: false },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/docs",
        destination: `${backendUrl}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backendUrl}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
