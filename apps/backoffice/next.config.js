/* global process */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
