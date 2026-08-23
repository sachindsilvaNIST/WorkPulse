function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  if (typeof window === "undefined") return Buffer.from(padded, "base64").toString("utf-8");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

/** Decodes a JWT's payload without verifying its signature — fine here since the token only ever
 * came from our own backend over HTTPS and this is purely for reading UI-facing claims (role,
 * disabled features), not for making any security decision the server doesn't already enforce. */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as T;
  } catch {
    return null;
  }
}

// ASP.NET Identity serializes ClaimTypes.Role/Claim("disabled_features", ...) under these long
// URIs (role) or literal keys (custom claims) in the JWT payload — not "role"/"roles".
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export interface JwtClaims {
  [ROLE_CLAIM]?: string | string[];
  disabled_features?: string;
  exp?: number;
}

export function isAdminClaims(claims: JwtClaims | null): boolean {
  if (!claims) return false;
  const role = claims[ROLE_CLAIM];
  return Array.isArray(role) ? role.includes("Admin") : role === "Admin";
}

export function disabledFeaturesClaims(claims: JwtClaims | null): string[] {
  if (!claims?.disabled_features) return [];
  return claims.disabled_features.split(",").map((f) => f.trim()).filter(Boolean);
}
