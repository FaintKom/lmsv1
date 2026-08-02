import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/pricing", destination: "/", permanent: false },
      // SAT practice retired from the product surface (2026-08-02, owner
      // decision). The engine stays in components/sat/* and the store; only
      // the routes and nav entries are gone.
      { source: "/sat-practice", destination: "/dashboard", permanent: false },
      { source: "/sat-practice/:path*", destination: "/dashboard", permanent: false },
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
