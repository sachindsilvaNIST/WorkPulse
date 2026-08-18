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
}

export type DocCategory = "Invoice" | "Receipt" | "FlightTicket" | "Insurance" | "Report" | "Other";

export interface TripDocumentMeta {
  id: string;
  tripReportId: string;
  category: DocCategory;
  label: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedUtc: string;
}

export interface TripDocumentWithTrip extends TripDocumentMeta {
  tripDestination: string;
  tripCategory: TripCategory;
  tripStartDate: string;
  tripEndDate: string;
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
