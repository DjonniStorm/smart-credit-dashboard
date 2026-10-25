/* global process */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Локальные сети dev-сервера: localhost и IP WSL для браузера Windows.
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : ["localhost", "127.0.0.1", "172.26.33.37"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins,
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
