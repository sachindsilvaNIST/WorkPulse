import type { AuthResponse, LoginRequest, RegisterRequest, MonthlyData, YearMonthDto } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";
const TOKEN_KEY = "workpulse.token";
const REFRESH_KEY = "workpulse.refreshToken";
const NAME_KEY = "workpulse.displayName";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NAME_KEY);
}

function setSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  localStorage.setItem(NAME_KEY, auth.displayName);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(NAME_KEY);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? body.title ?? message;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const authApi = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    const auth = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(req),
    });
    setSession(auth);
    return auth;
  },
  async register(req: RegisterRequest): Promise<AuthResponse> {
    const auth = await request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(req),
    });
    setSession(auth);
    return auth;
  },
  logout() {
    clearSession();
  },
};

export const attendanceApi = {
  getMonths: () => request<YearMonthDto[]>("/api/attendance/months"),
  getMonth: (year: number, month: number) =>
    request<MonthlyData>(`/api/attendance/${year}/${month}`),
};

export { ApiError };
