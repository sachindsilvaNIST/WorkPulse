// Attendance settlement periods run 21st-to-20th (not calendar month start/end).
// "August 2026 Settlement" = Jul 21, 2026 - Aug 20, 2026 (nominally).
//
// If either boundary date lands on a Saturday or Sunday, it rolls backward to the
// nearest preceding weekday. Example: if Aug 20 falls on a Saturday, the period ends
// Friday Aug 19 instead; if Jul 21 falls on a Sunday, the period starts Friday Jul 19.

export interface SettlementPeriod {
  year: number; // nominal settlement year (the year of the END month)
  month: number; // nominal settlement month (the END month, e.g. 8 for "August")
  label: string; // e.g. "August 2026"
  periodStart: string; // yyyy-mm-dd, weekend-adjusted
  periodEnd: string; // yyyy-mm-dd, weekend-adjusted
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isWeekend(y: number, m: number, d: number): boolean {
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

function rollBackToWeekday(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const date = new Date(Date.UTC(y, m - 1, d));
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// The calendar month immediately before (year, month), wrapping across a year boundary.
export function previousCalendarMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// The calendar month immediately after (year, month), wrapping across a year boundary.
export function nextCalendarMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function getSettlementPeriod(year: number, month: number): SettlementPeriod {
  const end = rollBackToWeekday(year, month, 20);
  const prev = previousCalendarMonth(year, month);
  const start = rollBackToWeekday(prev.year, prev.month, 21);

  return {
    year,
    month,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    periodStart: toISODate(start.y, start.m, start.d),
    periodEnd: toISODate(end.y, end.m, end.d),
  };
}

// The two calendar-month buckets whose records can fall inside a settlement period
// (the period always starts in the previous calendar month and ends in its own).
export function settlementBuckets(year: number, month: number): { year: number; month: number }[] {
  return [previousCalendarMonth(year, month), { year, month }];
}

// Which settlement period a given date falls into — e.g. Aug 25 falls after the August period's
// (Jul 21-Aug 20) end, so it belongs to the September period (Aug 21-Sep 20), even though the
// calendar month is still August. Used to default the dashboard to the settlement period that's
// actually current, rather than to whichever calendar month happens to have the most recently
// saved data (which lags behind on any day between a period's cutoff and month-end).
export function currentSettlementPeriodKey(today: Date = new Date()): { year: number; month: number } {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const todayIso = toISODate(year, month, today.getDate());
  const thisMonthPeriod = getSettlementPeriod(year, month);
  return todayIso > thisMonthPeriod.periodEnd ? nextCalendarMonth(year, month) : { year, month };
}

export { isWeekend };
