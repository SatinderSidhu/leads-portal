import type { NextConfig } from "next";
import { execSync } from "child_process";
import path from "path";

let commitSha = "dev";
try {
  commitSha = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  // Not in a git repo (e.g., Docker build without .git)
}

const nextConfig: NextConfig = {
  transpilePackages: ["@leads-portal/database"],
  serverExternalPackages: ["pdf-parse", "mammoth"],
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.NEXT_PUBLIC_COMMIT_SHA || commitSha,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
