import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  MonthlyData,
  YearMonthDto,
  DailyReport,
  WeeklyReport,
  TripReport,
  TripDocumentMeta,
  TripDocumentWithTrip,
  ContactRecord,
  QuickLink,
  DictEntryDto,
  AppSettings,
} from "./types";

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
  saveMonth: (year: number, month: number, data: MonthlyData) =>
    request<MonthlyData>(`/api/attendance/${year}/${month}`, { method: "PUT", body: JSON.stringify(data) }),
};

async function requestBlob(path: string): Promise<{ blob: Blob; fileName: string }> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return { blob: await res.blob(), fileName: match?.[1] ?? "download" };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const dailyReportsApi = {
  getAll: () => request<DailyReport[]>("/api/dailyreports"),
  create: (record: Partial<DailyReport>) =>
    request<DailyReport>("/api/dailyreports", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<DailyReport>) =>
    request<DailyReport>(`/api/dailyreports/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/dailyreports/${id}`, { method: "DELETE" }),
};

export const weeklyReportsApi = {
  getAll: () => request<WeeklyReport[]>("/api/weeklyreports"),
  create: (record: Partial<WeeklyReport>) =>
    request<WeeklyReport>("/api/weeklyreports", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<WeeklyReport>) =>
    request<WeeklyReport>(`/api/weeklyreports/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/weeklyreports/${id}`, { method: "DELETE" }),
};

export const tripReportsApi = {
  getAll: () => request<TripReport[]>("/api/tripreports"),
  create: (record: Partial<TripReport>) =>
    request<TripReport>("/api/tripreports", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<TripReport>) =>
    request<TripReport>(`/api/tripreports/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/tripreports/${id}`, { method: "DELETE" }),

  getDocuments: (tripId: string) => request<TripDocumentMeta[]>(`/api/tripreports/${tripId}/documents`),
  uploadDocument: async (tripId: string, file: File, category: string, label: string) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("label", label);
    const res = await fetch(`${API_BASE}/api/tripreports/${tripId}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    return (await res.json()) as TripDocumentMeta;
  },
  downloadDocument: (tripId: string, docId: string) => requestBlob(`/api/tripreports/${tripId}/documents/${docId}`),
  deleteDocument: (tripId: string, docId: string) =>
    request<void>(`/api/tripreports/${tripId}/documents/${docId}`, { method: "DELETE" }),
};

export const reimbursementApi = {
  getAllDocuments: (search?: string) =>
    request<TripDocumentWithTrip[]>(`/api/reimbursement/documents${search ? `?search=${encodeURIComponent(search)}` : ""}`),
};

export const contactsApi = {
  getAll: () => request<{ contacts: ContactRecord[] }>("/api/contacts"),
  create: (record: Partial<ContactRecord>) =>
    request<ContactRecord>("/api/contacts", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<ContactRecord>) =>
    request<void>(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/contacts/${id}`, { method: "DELETE" }),
};

export const quickLinksApi = {
  getAll: () => request<QuickLink[]>("/api/quicklinks"),
  create: (record: Partial<QuickLink>) =>
    request<QuickLink>("/api/quicklinks", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<QuickLink>) =>
    request<QuickLink>(`/api/quicklinks/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/quicklinks/${id}`, { method: "DELETE" }),
};

export const dictionaryApi = {
  getEntries: (search?: string) =>
    request<DictEntryDto[]>(`/api/dictionary/entries${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  create: (dto: Partial<DictEntryDto>) =>
    request<DictEntryDto>("/api/dictionary/entries", { method: "POST", body: JSON.stringify(dto) }),
  update: (id: number, dto: Partial<DictEntryDto>) =>
    request<DictEntryDto>(`/api/dictionary/entries/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  delete: (id: number) => request<void>(`/api/dictionary/entries/${id}`, { method: "DELETE" }),
};

export const settingsApi = {
  get: () => request<AppSettings>("/api/settings"),
  save: (settings: AppSettings) => request<void>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
};

export { ApiError };
