using System;
using System.Text.Json.Serialization;

namespace NistAttendance.Models;

public class AttendanceRecord
{
    public DateOnly Date { get; set; }

    [JsonIgnore]
    public DayOfWeek DayOfWeek => Date.DayOfWeek;

    public DayType DayType { get; set; } = DayType.WorkDay;
    public string? HolidayName { get; set; }

    public TimeOnly? LoginTime { get; set; }
    public TimeOnly? LogoutTime { get; set; }

    public int OvertimeHours { get; set; }
    public int OvertimeMinutes { get; set; }
    public bool IsOvertime { get; set; }

    public string? Notes { get; set; }

    [JsonIgnore]
    public string DayAbbreviation => DayOfWeek switch
    {
        System.DayOfWeek.Monday => "MON",
        System.DayOfWeek.Tuesday => "TUE",
        System.DayOfWeek.Wednesday => "WED",
        System.DayOfWeek.Thursday => "THU",
        System.DayOfWeek.Friday => "FRI",
        System.DayOfWeek.Saturday => "SAT",
        System.DayOfWeek.Sunday => "SUN",
        _ => ""
    };

    [JsonIgnore]
    public string LoginDisplay => DayType == DayType.WorkDay && LoginTime.HasValue
        ? LoginTime.Value.ToString("H:mm")
        : DayType == DayType.Holiday ? HolidayName ?? "HOLIDAY"
        : DayType == DayType.RestDay ? "休"
        : "";

    [JsonIgnore]
    public string LogoutDisplay => DayType == DayType.WorkDay && LogoutTime.HasValue
        ? LogoutTime.Value.ToString("H:mm")
        : "";

    [JsonIgnore]
    public string OvertimeHoursDisplay => IsOvertime ? OvertimeHours.ToString() : "";

    [JsonIgnore]
    public string OvertimeMinutesDisplay => IsOvertime ? OvertimeMinutes.ToString() : "";

    [JsonIgnore]
    public string OvertimeFlag => DayType == DayType.WorkDay && LoginTime.HasValue
        ? (IsOvertime ? "YES" : "NO")
        : "";
}
