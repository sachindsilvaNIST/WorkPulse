"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, getToken, getDisplayName, clearSession } from "@/lib/api/client";
import type { LoginRequest, RegisterRequest } from "@/lib/api/types";

interface AuthContextValue {
  isAuthenticated: boolean;
  displayName: string | null;
  isLoading: boolean;
  login: (req: LoginRequest) => Promise<void>;
  register: (req: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    setDisplayName(getDisplayName());
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (req: LoginRequest) => {
      const auth = await authApi.login(req);
      setIsAuthenticated(true);
      setDisplayName(auth.displayName);
      router.push("/home");
    },
    [router]
  );

  const register = useCallback(
    async (req: RegisterRequest) => {
      const auth = await authApi.register(req);
      setIsAuthenticated(true);
      setDisplayName(auth.displayName);
      router.push("/home");
    },
    [router]
  );

  const logout = useCallback(() => {
    clearSession();
    setIsAuthenticated(false);
    setDisplayName(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, displayName, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
