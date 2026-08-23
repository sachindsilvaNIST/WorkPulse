"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, settingsApi, getToken, getDisplayName } from "@/lib/api/client";
import type { LoginRequest, RegisterRequest } from "@/lib/api/types";
import { decodeJwt, isAdminClaims, disabledFeaturesClaims, type JwtClaims } from "@/lib/jwt";

interface AuthContextValue {
  isAuthenticated: boolean;
  displayName: string | null;
  isAdmin: boolean;
  disabledFeatures: string[];
  isLoading: boolean;
  /** Set once a 2FA-enabled account's password check succeeds but the code hasn't been verified
   * yet — the login page shows a code-entry step while this is non-null. */
  pendingTwoFactorEmail: string | null;
  login: (req: LoginRequest) => Promise<{ requiresTwoFactor: boolean }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  cancelTwoFactor: () => void;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readClaims(): JwtClaims | null {
  const token = getToken();
  return token ? decodeJwt<JwtClaims>(token) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingTwoFactorEmail, setPendingTwoFactorEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    setDisplayName(getDisplayName());
    const claims = readClaims();
    setIsAdmin(isAdminClaims(claims));
    setDisabledFeatures(disabledFeaturesClaims(claims));
    setIsLoading(false);
  }, []);

  const completeSession = useCallback(
    async (token: string, name: string) => {
      setIsAuthenticated(true);
      setDisplayName(name);
      const claims = decodeJwt<JwtClaims>(token);
      setIsAdmin(isAdminClaims(claims));
      setDisabledFeatures(disabledFeaturesClaims(claims));
      // Falls back to /home if the settings fetch fails (e.g. first-ever login racing user
      // creation) rather than leaving the user stuck on the login page.
      const landingPage = await settingsApi
        .get()
        .then((s) => s.defaultLandingPage || "/home")
        .catch(() => "/home");
      router.push(landingPage);
    },
    [router]
  );

  const login = useCallback(
    async (req: LoginRequest) => {
      const result = await authApi.login(req);
      if (result.requiresTwoFactor) {
        setPendingTwoFactorEmail(result.email);
        return { requiresTwoFactor: true };
      }
      if (result.auth) await completeSession(result.auth.token, result.auth.displayName);
      return { requiresTwoFactor: false };
    },
    [completeSession]
  );

  const verifyTwoFactor = useCallback(
    async (code: string) => {
      if (!pendingTwoFactorEmail) throw new Error("No pending two-factor login");
      const auth = await authApi.verifyTwoFactor(pendingTwoFactorEmail, code);
      setPendingTwoFactorEmail(null);
      await completeSession(auth.token, auth.displayName);
    },
    [pendingTwoFactorEmail, completeSession]
  );

  const cancelTwoFactor = useCallback(() => setPendingTwoFactorEmail(null), []);

  const register = useCallback(
    async (req: RegisterRequest) => {
      const auth = await authApi.register(req);
      await completeSession(auth.token, auth.displayName);
    },
    [completeSession]
  );

  const logout = useCallback(() => {
    authApi.logout();
    setIsAuthenticated(false);
    setDisplayName(null);
    setIsAdmin(false);
    setDisabledFeatures([]);
    setPendingTwoFactorEmail(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        displayName,
        isAdmin,
        disabledFeatures,
        isLoading,
        pendingTwoFactorEmail,
        login,
        verifyTwoFactor,
        cancelTwoFactor,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
