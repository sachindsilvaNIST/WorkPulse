/** Overtime and the standard work day are duration-based, not clock-time-based: start/end times
 * vary day to day (except WFH, which is pre-approved for the fixed 08:25–17:30 schedule and
 * doesn't carry punch times at all), so "late" only makes sense relative to how long someone
 * actually worked, not relative to a fixed clock time. This is the single source of truth for
 * that computation — used by both the entry dialog (on save) and the dashboard (for display),
 * so a record's shown overtime always matches its stored times instead of depending on whether
 * someone remembered to flag it. */

export function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/** The standard day's length, from Settings > Work Hours — a duration, not a pair of clock times. */
export function standardDurationMinutes(standardLoginTime: string, standardLogoutTime: string): number {
  const start = toMinutes(standardLoginTime) ?? 0;
  const end = toMinutes(standardLogoutTime) ?? 0;
  return Math.max(0, end - start);
}

export interface OvertimeResult {
  isOvertime: boolean;
  hours: number;
  minutes: number;
  /** Minutes actually worked (logout − login), or null when either time is missing. */
  workedMinutes: number | null;
}

export function computeOvertime(
  loginTime: string | null | undefined,
  logoutTime: string | null | undefined,
  standardLoginTime: string,
  standardLogoutTime: string,
  breakDeductionMinutes: number
): OvertimeResult {
  const inMin = toMinutes(loginTime);
  const outMin = toMinutes(logoutTime);
  if (inMin == null || outMin == null || outMin <= inMin) {
    return { isOvertime: false, hours: 0, minutes: 0, workedMinutes: null };
  }
  const worked = outMin - inMin;
  const standard = standardDurationMinutes(standardLoginTime, standardLogoutTime);
  const otMinutes = worked - standard - breakDeductionMinutes;
  if (otMinutes <= 0) return { isOvertime: false, hours: 0, minutes: 0, workedMinutes: worked };
  return { isOvertime: true, hours: Math.floor(otMinutes / 60), minutes: otMinutes % 60, workedMinutes: worked };
}
