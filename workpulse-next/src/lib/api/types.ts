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
  | "AnnualPaidLeave"
  | "UnpaidLeave"
  | "PublicHoliday"
  | "Weekend"
  | "BusinessTrip";

export interface AttendanceRecord {
  date: string;
  dayType: DayType;
  holidayName?: string | null;
  tripCategory?: "Domestic" | "Overseas" | null;
  tripRegion?: string | null;
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
