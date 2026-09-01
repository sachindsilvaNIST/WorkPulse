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
  ReimbursementStatusValue,
  ContactRecord,
  QuickLink,
  DictEntryDto,
  AppSettings,
  AdminUser,
  AdminUserCreateRequest,
  AdminUserUpdateRequest,
  AdminUserFeatures,
  LoginResult,
  RegisterResult,
  CurrentUser,
  UserSession,
  ReimbursementCategory,
  GoogleDriveStatus,
  GmailStatus,
  GmailLabel,
  Resource,
  ResourceType,
  AppNotification,
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

/** Keeps the persisted display name (and anything reading it, e.g. AuthContext) in sync after a
 * profile edit — session creation writes this via setSession, this is the update-in-place path. */
export function setDisplayName(name: string) {
  localStorage.setItem(NAME_KEY, name);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
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

  // Some endpoints return 200 with an empty body instead of 204 — checking status alone isn't
  // enough to know whether there's JSON to parse, so read as text first and only parse if non-empty.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Fire-and-forget ping to wake a sleeping Render free-tier instance as early as possible —
 * called once on app mount so the ~50s cold start happens in the background while the user is
 * still looking at the first screen, rather than blocking whichever data request they make first. */
export function warmUpApi() {
  fetch(`${API_BASE}/api/health`).catch(() => {});
}

export const authApi = {
  // Returns the raw challenge result rather than auto-completing the session — a 2FA-enabled
  // account gets { requiresTwoFactor: true, auth: null } here and only actually signs in once
  // verifyTwoFactor() succeeds.
  async login(req: LoginRequest): Promise<LoginResult> {
    const result = await request<LoginResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (result.auth) setSession(result.auth);
    return result;
  },
  async googleSignIn(credential: string): Promise<LoginResult> {
    const result = await request<LoginResult>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    if (result.auth) setSession(result.auth);
    return result;
  },
  async verifyTwoFactor(email: string, code: string): Promise<AuthResponse> {
    const auth = await request<AuthResponse>("/api/auth/login/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    setSession(auth);
    return auth;
  },
  // No account exists yet — the pending signup lives server-side (in-memory, keyed by
  // registrationId) until confirmEmail succeeds, so nothing is ever created in the database for
  // an abandoned registration.
  register: (req: RegisterRequest) => request<RegisterResult>("/api/auth/register", { method: "POST", body: JSON.stringify(req) }),
  async confirmEmail(registrationId: string, code: string): Promise<AuthResponse> {
    const auth = await request<AuthResponse>("/api/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ registrationId, code }),
    });
    setSession(auth);
    return auth;
  },
  resendConfirmationCode: (registrationId: string) =>
    request<void>("/api/auth/resend-confirmation-code", { method: "POST", body: JSON.stringify({ registrationId }) }),
  logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      // Best-effort — the session is cleared client-side regardless of whether this succeeds.
      void request<void>("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }).catch(() => {});
    }
    clearSession();
  },
  me: () => request<CurrentUser>("/api/auth/me"),
  send2faSetupCode: () => request<void>("/api/auth/2fa/send-code", { method: "POST" }),
  enable2fa: (code: string) => request<void>("/api/auth/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  disable2fa: () => request<void>("/api/auth/2fa/disable", { method: "POST" }),
  updateProfile: (displayName: string) =>
    request<CurrentUser>("/api/auth/profile", { method: "PUT", body: JSON.stringify({ displayName }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  async deleteAccount(password: string) {
    await request<void>("/api/auth/account", { method: "DELETE", body: JSON.stringify({ password }) });
    clearSession();
  },
};

export const attendanceApi = {
  getMonths: () => request<YearMonthDto[]>("/api/attendance/months"),
  getMonth: (year: number, month: number) =>
    request<MonthlyData>(`/api/attendance/${year}/${month}`),
  saveMonth: (year: number, month: number, data: MonthlyData) =>
    request<MonthlyData>(`/api/attendance/${year}/${month}`, { method: "PUT", body: JSON.stringify(data) }),
  exportMonths: (months: { year: number; month: number }[], format: "xlsx" | "html") =>
    requestBlob(`/api/excel/attendance/export-by-month?format=${format}`, {
      method: "POST",
      body: JSON.stringify(months),
    }),
};

async function requestBlob(path: string, init?: RequestInit): Promise<{ blob: Blob; fileName: string }> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
  exportReports: (ids: string[], format: "xlsx" | "html") =>
    requestBlob(`/api/excel/daily-reports/export?format=${format}`, { method: "POST", body: JSON.stringify(ids) }),
};

export const weeklyReportsApi = {
  getAll: () => request<WeeklyReport[]>("/api/weeklyreports"),
  create: (record: Partial<WeeklyReport>) =>
    request<WeeklyReport>("/api/weeklyreports", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<WeeklyReport>) =>
    request<WeeklyReport>(`/api/weeklyreports/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/weeklyreports/${id}`, { method: "DELETE" }),
  exportReports: (ids: string[], format: "xlsx" | "html") =>
    requestBlob(`/api/excel/weekly-reports/export?format=${format}`, { method: "POST", body: JSON.stringify(ids) }),
};

export const tripReportsApi = {
  getAll: () => request<TripReport[]>("/api/tripreports"),
  create: (record: Partial<TripReport>) =>
    request<TripReport>("/api/tripreports", { method: "POST", body: JSON.stringify(record) }),
  update: (id: string, record: Partial<TripReport>) =>
    request<TripReport>(`/api/tripreports/${id}`, { method: "PUT", body: JSON.stringify(record) }),
  delete: (id: string) => request<void>(`/api/tripreports/${id}`, { method: "DELETE" }),

  getDocuments: (tripId: string) => request<TripDocumentMeta[]>(`/api/tripreports/${tripId}/documents`),
  uploadDocument: async (
    tripId: string,
    file: File,
    category: string,
    label: string,
    documentDate?: string,
    amount?: number,
    currency?: string
  ) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("label", label);
    if (documentDate) form.append("documentDate", documentDate);
    if (amount != null) form.append("amount", String(amount));
    if (currency) form.append("currency", currency);
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
  // Partial update — amount/resource-link (Trips) and reimbursement status/resource-link
  // (Reimbursement) both go through this one endpoint, since it's the same underlying document.
  updateDocument: (
    tripId: string,
    docId: string,
    update: { amount?: number; currency?: string; reimbursementStatus?: ReimbursementStatusValue; resourceId?: string; clearResourceLink?: boolean }
  ) => request<TripDocumentMeta>(`/api/tripreports/${tripId}/documents/${docId}`, { method: "PUT", body: JSON.stringify(update) }),
  exportTrip: (tripId: string, format: "xlsx" | "html") =>
    requestBlob(`/api/excel/trips/${tripId}/export?format=${format}`, { method: "POST" }),
};

export const reimbursementApi = {
  getAllDocuments: (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    const qs = params.toString();
    return request<TripDocumentWithTrip[]>(`/api/reimbursement/documents${qs ? `?${qs}` : ""}`);
  },
  getCategories: () => request<ReimbursementCategory[]>("/api/reimbursement/categories"),
  createCategory: (name: string) =>
    request<ReimbursementCategory>("/api/reimbursement/categories", { method: "POST", body: JSON.stringify({ name }) }),
  renameCategory: (id: number, name: string) =>
    request<ReimbursementCategory>(`/api/reimbursement/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCategory: (id: number) => request<void>(`/api/reimbursement/categories/${id}`, { method: "DELETE" }),
};

export const googleDriveApi = {
  status: () => request<GoogleDriveStatus>("/api/googledrive/status"),
  getConnectUrl: () => request<{ url: string }>("/api/googledrive/connect"),
  disconnect: () => request<void>("/api/googledrive/disconnect", { method: "POST" }),
};

export const gmailApi = {
  status: () => request<GmailStatus>("/api/gmail/status"),
  getConnectUrl: () => request<{ url: string }>("/api/gmail/connect"),
  disconnect: () => request<void>("/api/gmail/disconnect", { method: "POST" }),
  getLabels: () => request<GmailLabel[]>("/api/gmail/labels"),
  createLabel: (name: string) => request<GmailLabel>("/api/gmail/labels", { method: "POST", body: JSON.stringify({ name }) }),
  renameLabel: (id: number, name: string) =>
    request<GmailLabel>(`/api/gmail/labels/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteLabel: (id: number) => request<void>(`/api/gmail/labels/${id}`, { method: "DELETE" }),
};

export const notificationsApi = {
  getAll: () => request<AppNotification[]>("/api/notifications"),
  markRead: (id: string) => request<AppNotification>(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => request<void>("/api/notifications/read-all", { method: "POST" }),
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

export const sessionsApi = {
  list: () => request<UserSession[]>("/api/sessions"),
  revoke: (id: number) => request<void>(`/api/sessions/${id}`, { method: "DELETE" }),
  revokeAll: () => request<void>("/api/sessions", { method: "DELETE" }),
};

export const adminApi = {
  getUsers: () => request<AdminUser[]>("/api/admin/users"),
  createUser: (dto: AdminUserCreateRequest) => request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(dto) }),
  updateUser: (id: string, dto: AdminUserUpdateRequest) =>
    request<void>(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
  deleteUser: (id: string) => request<void>(`/api/admin/users/${id}`, { method: "DELETE" }),
  toggleDisable: (id: string) => request<{ isDisabled: boolean }>(`/api/admin/users/${id}/toggle-disable`, { method: "POST" }),
  resetPassword: (id: string, newPassword: string) =>
    request<void>(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }),
  getUserFeatures: (id: string) => request<AdminUserFeatures>(`/api/admin/users/${id}/features`),
  updateUserFeatures: (id: string, disabled: string[]) =>
    request<void>(`/api/admin/users/${id}/features`, { method: "PUT", body: JSON.stringify({ disabled }) }),
};

export const resourcesApi = {
  getAll: () => request<Resource[]>("/api/resources"),
  async create(input: {
    type: ResourceType;
    title: string;
    notes: string;
    url?: string;
    tags: string;
    keywords: string;
    file?: File | null;
  }): Promise<Resource> {
    const token = getToken();
    const form = new FormData();
    form.append("type", input.type);
    form.append("title", input.title);
    form.append("notes", input.notes);
    if (input.url) form.append("url", input.url);
    form.append("tags", input.tags);
    form.append("keywords", input.keywords);
    if (input.file) form.append("file", input.file);
    const res = await fetch(`${API_BASE}/api/resources`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = (await res.json()).error ?? message;
      } catch {
        /* no JSON body */
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as Resource;
  },
  update: (id: string, input: { title: string; notes: string; url?: string; tags: string; keywords: string }) =>
    request<Resource>(`/api/resources/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  delete: (id: string) => request<void>(`/api/resources/${id}`, { method: "DELETE" }),
  download: (id: string) => requestBlob(`/api/resources/${id}/download`),
};

export const exportApi = {
  all: () => requestBlob("/api/export/all"),
  restore: async (file: File): Promise<{ restored: number; skipped: number }> => {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/export/restore`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = (await res.json()).error ?? message;
      } catch {
        /* no JSON body */
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as { restored: number; skipped: number };
  },
};

export { ApiError };
