import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
