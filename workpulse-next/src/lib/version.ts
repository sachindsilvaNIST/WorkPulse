/** Injected at build time by next.config.ts (package.json version + git short SHA), so this is
 * accurate per-deployment without depending on any hosting-provider-specific env vars. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "unknown";
export const APP_ENV = process.env.NODE_ENV === "production" ? "Production" : "Development";
