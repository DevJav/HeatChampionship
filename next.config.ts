import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inlined at build time so client components see them too: one language per deployment
  env: {
    APP_LOCALE: process.env.APP_LOCALE ?? "es",
    APP_TIME_ZONE: process.env.APP_TIME_ZONE ?? "Europe/Madrid",
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: let phones on the home network (http://192.168.x.x:3000) load the dev scripts
  allowedDevOrigins: ["192.168.*.*"],
  experimental: {
    serverActions: {
      // Race photos are uploaded through a server action (resized on the server)
      bodySizeLimit: "50mb",
    },
  },
  turbopack: {
    // Pin the root: a package-lock.json in a parent directory confuses auto-detection
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
