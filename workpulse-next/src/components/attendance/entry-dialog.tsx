"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { AttendanceRecord, DayType, TripCategory } from "@/lib/api/types";
import { PREFECTURES, COUNTRIES } from "@/lib/trip-data";
import { DAY_TYPE_OPTIONS, NOTE_ENABLED_DAY_TYPES, TIME_TRACKED_DAY_TYPES } from "@/lib/attendance-day-types";

const STANDARD_LOGOUT_MIN = 17 * 60 + 30;
const BREAK_DEDUCTION_MIN = 20;

function calcOvertime(logoutTime: string): { isOvertime: boolean; hours: number; minutes: number } {
  if (!logoutTime) return { isOvertime: false, hours: 0, minutes: 0 };
  const [h, m] = logoutTime.split(":").map(Number);
  const totalMin = h * 60 + m;
  if (totalMin <= STANDARD_LOGOUT_MIN) return { isOvertime: false, hours: 0, minutes: 0 };
  const otMin = totalMin - STANDARD_LOGOUT_MIN - BREAK_DEDUCTION_MIN;
  if (otMin <= 0) return { isOvertime: false, hours: 0, minutes: 0 };
  return { isOvertime: true, hours: Math.floor(otMin / 60), minutes: otMin % 60 };
}

export function AttendanceEntryDialog({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<AttendanceRecord> & { date: string };
  onSave: (records: AttendanceRecord[]) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initial.date);
  const [dayType, setDayType] = useState<DayType | "">(initial.dayType ?? "");
  const [holidayName, setHolidayName] = useState(initial.holidayName ?? "");
  const [leaveHours, setLeaveHours] = useState(initial.leaveHours ?? 0);
  const [leaveMinutes, setLeaveMinutes] = useState(initial.leaveMinutes ?? 0);
  const [loginTime, setLoginTime] = useState(initial.loginTime ?? "08:25");
  const [logoutTime, setLogoutTime] = useState(initial.logoutTime ?? "17:30");
  const [overtimeOn, setOvertimeOn] = useState<boolean>(
    initial.isOvertimeDecided ? !!initial.isOvertime : false
  );
  const [tripCategory, setTripCategory] = useState<TripCategory>(initial.tripCategory ?? "Domestic");
  const [tripRegion, setTripRegion] = useState(initial.tripRegion ?? "");
  const [departureDate, setDepartureDate] = useState(initial.date);
  const [returnDate, setReturnDate] = useState(initial.date);
  const [error, setError] = useState("");

  const overtime = calcOvertime(overtimeOn ? logoutTime : "");

  useEffect(() => {
    if (!overtimeOn) return;
    // live-recompute as logoutTime changes; nothing else to do, calc happens on render
  }, [logoutTime, overtimeOn]);

  function handleSave() {
    if (!dayType) {
      setError("Please select a Day Type.");
      return;
    }
    if (dayType === "HourlyLeave" && leaveHours === 0 && leaveMinutes === 0) {
      setError("Please set the hours or minutes taken for Hourly Leave.");
      return;
    }
    if (dayType === "BusinessTrip") {
      if (!tripRegion) {
        setError(tripCategory === "Domestic" ? "Please select a prefecture." : "Please select a country.");
        return;
      }
      if (returnDate < departureDate) {
        setError("Return date must be on or after the departure date.");
        return;
      }
      const records: AttendanceRecord[] = [];
      const d = new Date(departureDate);
      const end = new Date(returnDate);
      while (d <= end) {
        records.push({
          date: d.toISOString().slice(0, 10),
          dayType: "BusinessTrip",
          holidayName: holidayName || null,
          tripCategory,
          tripRegion,
          overtimeHours: 0,
          overtimeMinutes: 0,
          isOvertime: false,
          isOvertimeDecided: false,
        });
        d.setDate(d.getDate() + 1);
      }
      onSave(records);
      return;
    }

    const isTimeTracked = TIME_TRACKED_DAY_TYPES.includes(dayType);
    const record: AttendanceRecord = {
      date,
      dayType,
      holidayName: NOTE_ENABLED_DAY_TYPES.includes(dayType) ? holidayName || null : null,
      leaveHours: dayType === "HourlyLeave" ? leaveHours : null,
      leaveMinutes: dayType === "HourlyLeave" ? leaveMinutes : null,
      loginTime: isTimeTracked ? loginTime : null,
      logoutTime: isTimeTracked ? logoutTime : null,
      overtimeHours: dayType === "WorkDay" ? overtime.hours : 0,
      overtimeMinutes: dayType === "WorkDay" ? overtime.minutes : 0,
      isOvertime: dayType === "WorkDay" ? overtime.isOvertime : false,
      isOvertimeDecided: dayType === "WorkDay",
    };
    onSave([record]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Attendance Entry</h2>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-foreground/5">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {dayType !== "BusinessTrip" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Day Type <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DAY_TYPE_OPTIONS.map((d) => (
                <Button
                  key={d.value}
                  type="button"
                  variant={dayType === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDayType(d.value);
                    setError("");
                  }}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>

          {dayType === "HourlyLeave" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Duration <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={leaveHours}
                    onChange={(e) => setLeaveHours(Math.max(0, Number(e.target.value)))}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    hrs
                  </span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={leaveMinutes}
                    onChange={(e) => setLeaveMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="pr-10"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
            </div>
          )}

          {dayType && NOTE_ENABLED_DAY_TYPES.includes(dayType) && (
            <Input
              placeholder={
                dayType === "Other"
                  ? "Describe this entry (optional)"
                  : dayType === "HourlyLeave"
                    ? "Description (optional)"
                    : "Holiday / leave name (optional)"
              }
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
          )}

          {dayType && TIME_TRACKED_DAY_TYPES.includes(dayType) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Login</label>
                  <Input type="time" value={loginTime} onChange={(e) => setLoginTime(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Logout</label>
                  <Input type="time" value={logoutTime} onChange={(e) => setLogoutTime(e.target.value)} />
                </div>
              </div>
              {dayType === "WorkDay" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Overtime?</label>
                  <div className="flex items-center gap-2">
                    <Switch checked={overtimeOn} onCheckedChange={setOvertimeOn} />
                    <span className="text-sm text-muted-foreground">{overtimeOn ? "On" : "Off"}</span>
                  </div>
                  {overtimeOn && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {overtime.isOvertime
                        ? `Overtime: ${overtime.hours} Hr ${overtime.minutes} Min`
                        : "Logout time is within standard hours (no OT)."}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {dayType === "BusinessTrip" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Departure</label>
                  <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Return</label>
                  <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Trip Type</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={tripCategory === "Domestic" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTripCategory("Domestic");
                      setTripRegion("");
                    }}
                  >
                    Domestic
                  </Button>
                  <Button
                    type="button"
                    variant={tripCategory === "Overseas" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTripCategory("Overseas");
                      setTripRegion("");
                    }}
                  >
                    Overseas
                  </Button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {tripCategory === "Domestic" ? "Prefecture" : "Country"}
                </label>
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-full border border-input bg-background/50 py-2 pl-4 pr-9 text-sm backdrop-blur-md outline-none"
                    value={tripRegion}
                    onChange={(e) => setTripRegion(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(tripCategory === "Domestic" ? PREFECTURES : COUNTRIES).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <Input placeholder="Location / notes (optional)" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="mt-2 flex gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
