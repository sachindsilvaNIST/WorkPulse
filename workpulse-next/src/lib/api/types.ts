export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginResult {
  requiresTwoFactor: boolean;
  email: string | null;
  auth: AuthResponse | null;
}

export interface RegisterResult {
  registrationId: string;
  email: string;
}

export interface CurrentUser {
  email: string;
  displayName: string;
  twoFactorEnabled: boolean;
}

export interface UserSession {
  id: number;
  deviceLabel: string;
  ipAddress: string | null;
  createdUtc: string;
  lastUsedUtc: string;
}

export type DayType =
  | "WorkDay"
  | "HalfDayLeave"
  | "AMLeave"
  | "PMLeave"
  | "HourlyLeave"
  | "AnnualPaidLeave"
  | "UnpaidLeave"
  | "PublicHoliday"
  | "Weekend"
  | "BusinessTrip"
  | "Other";

export interface AttendanceRecord {
  date: string;
  dayType: DayType;
  holidayName?: string | null;
  tripCategory?: "Domestic" | "Overseas" | null;
  tripRegion?: string | null;
  leaveHours?: number | null;
  leaveMinutes?: number | null;
  loginTime?: string | null;
  logoutTime?: string | null;
  overtimeHours: number;
  overtimeMinutes: number;
  isOvertime: boolean;
  isOvertimeDecided: boolean;
}

export interface MonthlyData {
  year: number;
  month: number;
  monthLabel: string;
  title: string;
  records: AttendanceRecord[];
  lastModifiedUtc?: string;
}

export interface YearMonthDto {
  year: number;
  month: number;
  label: string;
}

export interface DailyReport {
  id: string;
  reportDate: string; // yyyy-MM-dd
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

export interface WeeklyReport {
  id: string;
  weekStartDate: string; // yyyy-MM-dd
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

export type TripCategory = "Domestic" | "Overseas";

export interface TripReport {
  id: string;
  category: TripCategory;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  notes: string;
  lastModifiedUtc?: string;
  documentCount: number;
}

export interface TripDocumentMeta {
  id: string;
  tripReportId: string;
  /** User-created, DB-backed category name — see ReimbursementCategory / reimbursementApi. */
  category: string;
  label: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedUtc: string;
  documentDate?: string | null;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
}

export interface TripDocumentWithTrip extends TripDocumentMeta {
  tripDestination: string;
  tripCategory: TripCategory;
  tripStartDate: string;
  tripEndDate: string;
}

export interface ReimbursementCategory {
  id: number;
  name: string;
}

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  connectedUtc: string | null;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  emailAddress: string | null;
  connectedUtc: string | null;
}

export interface GmailLabel {
  id: number;
  name: string;
  type: "system" | "user";
  color: string | null;
}

export interface ContactRecord {
  id: string;
  affiliation: string;
  familyName: string;
  givenName: string;
  department: string;
  email: string;
  intercom: string;
  contactNumber: string;
  notes: string;
  lastModifiedUtc?: string;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  category: string;
  keywords: string;
  sortOrder: number;
  lastModifiedUtc?: string;
}

export interface DictLabelDto {
  id: number;
  name: string;
}

export interface AppSettings {
  standardLoginTime: string; // "HH:mm:ss"
  standardLogoutTime: string;
  overtimeBreakDeductionMinutes: number;
  defaultTitle: string;
  lastOpenedMonth?: string | null;
  themeVariant: string;
  fontSizePreset: string;
  dateFormat: string;
  weekStartDay: string; // "Sunday" | "Monday"
  defaultLandingPage: string;
  idleTimeoutMinutes: number; // 0 = disabled
  notificationsEnabled: boolean;
  notificationChannel: string; // "Email" | "In-app"
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isDisabled: boolean;
}

export interface AdminUserCreateRequest {
  email: string;
  displayName: string;
  password: string;
  isAdmin: boolean;
}

export interface AdminUserUpdateRequest {
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export interface AdminUserFeatures {
  catalog: string[];
  disabled: string[];
}

export interface DictEntryDto {
  id: number;
  japanese: string;
  reading?: string | null;
  meaning: string;
  exampleJp?: string | null;
  exampleEn?: string | null;
  notes?: string | null;
  jlptLevel?: string | null;
  createdUtc: string;
  lastModifiedUtc: string;
  labels: DictLabelDto[];
}

export type ResourceType = "Link" | "File" | "Note";

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  notes: string;
  url: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  driveFileId?: string | null;
  driveWebViewLink?: string | null;
  tags: string;
  keywords: string;
  createdUtc: string;
  lastModifiedUtc: string;
}
