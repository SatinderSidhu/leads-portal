import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@leads-portal/database"],
  serverExternalPackages: ["pdf-parse", "mammoth"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
