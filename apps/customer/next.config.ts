import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@leads-portal/database"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
