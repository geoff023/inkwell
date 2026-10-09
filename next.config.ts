import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off: nearly every page reads the signed-in session,
  // and private writing must never land in a shared cache.
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
