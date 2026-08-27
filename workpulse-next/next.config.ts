import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import pkg from "./package.json";

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: __dirname }).toString().trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: gitShortSha(),
  },
};

export default nextConfig;
