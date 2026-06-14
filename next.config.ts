import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The extension posts events cross-origin; allow it during dev.
  async headers() {
    return [
      {
        source: "/api/ingest/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-fl-token" },
        ],
      },
    ];
  },
};

export default nextConfig;
