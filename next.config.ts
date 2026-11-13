import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Every page is per-visitor (cookie-keyed sandbox), so nothing is prerendered
  // and Cache Components would add Suspense plumbing for no benefit.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
