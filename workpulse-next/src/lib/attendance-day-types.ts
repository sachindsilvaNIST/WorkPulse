import type { DayType } from "@/lib/api/types";

export interface DayTypeOption {
  value: DayType;
  label: string;
  color: string;
}

// User-selectable Day Type choices (excludes "Weekend", which is derived from the date, not chosen).
export const DAY_TYPE_OPTIONS: DayTypeOption[] = [
  { value: "WorkDay", label: "Work Day", color: "var(--brand-blue)" },
  { value: "HalfDayLeave", label: "Half Day Leave", color: "var(--brand-orange)" },
  { value: "AMLeave", label: "AM Leave", color: "var(--brand-teal)" },
  { value: "PMLeave", label: "PM Leave", color: "var(--brand-teal)" },
  { value: "HourlyLeave", label: "Hourly Leave", color: "#8E8E93" },
  { value: "AnnualPaidLeave", label: "Annual Paid Leave", color: "#FFD60A" },
  { value: "UnpaidLeave", label: "Unpaid Leave", color: "#636366" },
  { value: "PublicHoliday", label: "Public Holiday", color: "var(--brand-green)" },
  { value: "BusinessTrip", label: "Business Trip", color: "var(--brand-purple)" },
  { value: "Other", label: "Other", color: "var(--brand-rose)" },
];

export const DAY_TYPE_COLORS: Record<string, string> = {
  ...Object.fromEntries(DAY_TYPE_OPTIONS.map((o) => [o.value, o.color])),
  Weekend: "#C7C7CC",
};

export function dayTypeLabel(value: string): string {
  return DAY_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

// Day types where the user still works part of the day and logs actual login/logout times.
export const TIME_TRACKED_DAY_TYPES: DayType[] = ["WorkDay", "HalfDayLeave", "AMLeave", "PMLeave"];

// Day types eligible for an optional free-text note (everything except Work Day and Business Trip,
// which have their own dedicated fields).
export const NOTE_ENABLED_DAY_TYPES: DayType[] = [
  "HalfDayLeave",
  "AMLeave",
  "PMLeave",
  "HourlyLeave",
  "AnnualPaidLeave",
  "UnpaidLeave",
  "PublicHoliday",
  "Other",
];

// Counted toward the "Leave" stat on the dashboard.
export const LEAVE_DAY_TYPES: DayType[] = [
  "HalfDayLeave",
  "AMLeave",
  "PMLeave",
  "HourlyLeave",
  "AnnualPaidLeave",
  "UnpaidLeave",
];
