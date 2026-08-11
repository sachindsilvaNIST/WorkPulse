"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { AttendanceRecord, DayType, TripCategory } from "@/lib/api/types";
import { PREFECTURES, COUNTRIES } from "@/lib/trip-data";

const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: "WorkDay", label: "Work Day" },
  { value: "AnnualPaidLeave", label: "Annual Paid Leave" },
  { value: "UnpaidLeave", label: "Unpaid Leave" },
  { value: "PublicHoliday", label: "Public Holiday" },
  { value: "BusinessTrip", label: "Business Trip" },
];

const STANDARD_LOGOUT_MIN = 17 * 60 + 25;
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
  const [dayType, setDayType] = useState<DayType>(initial.dayType ?? "WorkDay");
  const [holidayName, setHolidayName] = useState(initial.holidayName ?? "");
  const [loginTime, setLoginTime] = useState(initial.loginTime ?? "08:20");
  const [logoutTime, setLogoutTime] = useState(initial.logoutTime ?? "17:25");
  const [overtimeSelection, setOvertimeSelection] = useState<"" | "yes" | "no">(
    initial.isOvertimeDecided ? (initial.isOvertime ? "yes" : "no") : ""
  );
  const [tripCategory, setTripCategory] = useState<TripCategory>(initial.tripCategory ?? "Domestic");
  const [tripRegion, setTripRegion] = useState(initial.tripRegion ?? "");
  const [departureDate, setDepartureDate] = useState(initial.date);
  const [returnDate, setReturnDate] = useState(initial.date);
  const [error, setError] = useState("");

  const overtime = calcOvertime(overtimeSelection === "yes" ? logoutTime : "");

  useEffect(() => {
    if (overtimeSelection !== "yes") return;
    // live-recompute as logoutTime changes; nothing else to do, calc happens on render
  }, [logoutTime, overtimeSelection]);

  function handleSave() {
    if (dayType === "WorkDay" && overtimeSelection === "") {
      setError("Please select Yes or No for Overtime.");
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

    const record: AttendanceRecord = {
      date,
      dayType,
      holidayName:
        dayType === "AnnualPaidLeave" || dayType === "UnpaidLeave" || dayType === "PublicHoliday" ? holidayName : null,
      loginTime: dayType === "WorkDay" ? loginTime : null,
      logoutTime: dayType === "WorkDay" ? logoutTime : null,
      overtimeHours: dayType === "WorkDay" ? overtime.hours : 0,
      overtimeMinutes: dayType === "WorkDay" ? overtime.minutes : 0,
      isOvertime: dayType === "WorkDay" ? overtime.isOvertime : false,
      isOvertimeDecided: dayType === "WorkDay" ? overtimeSelection !== "" : false,
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Day Type</label>
            <select
              className="h-10 w-full rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
              value={dayType}
              onChange={(e) => setDayType(e.target.value as DayType)}
            >
              {DAY_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {(dayType === "AnnualPaidLeave" || dayType === "UnpaidLeave" || dayType === "PublicHoliday") && (
            <Input placeholder="Holiday / leave name (optional)" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} />
          )}

          {dayType === "WorkDay" && (
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
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Overtime?</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={overtimeSelection === "yes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOvertimeSelection("yes")}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={overtimeSelection === "no" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOvertimeSelection("no")}
                  >
                    No
                  </Button>
                </div>
                {overtimeSelection === "yes" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {overtime.isOvertime
                      ? `Overtime: ${overtime.hours} Hr ${overtime.minutes} Min`
                      : "Logout time is within standard hours (no OT)."}
                  </p>
                )}
              </div>
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
                <select
                  className="h-10 w-full rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
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
