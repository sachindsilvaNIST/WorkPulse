"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, settingsApi, getToken, getDisplayName, setDisplayName as persistDisplayName } from "@/lib/api/client";
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
  /** Set right after registering — the register page shows a code-entry step while this is
   * non-null. No account exists yet at this point; it's only created once confirmEmail succeeds. */
  pendingEmailConfirmationEmail: string | null;
  register: (req: RegisterRequest) => Promise<void>;
  confirmEmail: (code: string) => Promise<void>;
  resendConfirmationCode: () => Promise<void>;
  cancelEmailConfirmation: () => void;
  logout: () => void;
  updateDisplayName: (name: string) => void;
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
  const [pendingEmailConfirmationEmail, setPendingEmailConfirmationEmail] = useState<string | null>(null);
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null);
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

  const register = useCallback(async (req: RegisterRequest) => {
    const result = await authApi.register(req);
    setPendingRegistrationId(result.registrationId);
    setPendingEmailConfirmationEmail(result.email);
  }, []);

  const confirmEmail = useCallback(
    async (code: string) => {
      if (!pendingRegistrationId) throw new Error("No pending registration");
      const auth = await authApi.confirmEmail(pendingRegistrationId, code);
      setPendingRegistrationId(null);
      setPendingEmailConfirmationEmail(null);
      await completeSession(auth.token, auth.displayName);
    },
    [pendingRegistrationId, completeSession]
  );

  const resendConfirmationCode = useCallback(async () => {
    if (!pendingRegistrationId) throw new Error("No pending registration");
    await authApi.resendConfirmationCode(pendingRegistrationId);
  }, [pendingRegistrationId]);

  const cancelEmailConfirmation = useCallback(() => {
    setPendingRegistrationId(null);
    setPendingEmailConfirmationEmail(null);
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    persistDisplayName(name);
    setDisplayName(name);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setIsAuthenticated(false);
    setDisplayName(null);
    setIsAdmin(false);
    setDisabledFeatures([]);
    setPendingTwoFactorEmail(null);
    setPendingEmailConfirmationEmail(null);
    setPendingRegistrationId(null);
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
        pendingEmailConfirmationEmail,
        register,
        confirmEmail,
        resendConfirmationCode,
        cancelEmailConfirmation,
        logout,
        updateDisplayName,
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
