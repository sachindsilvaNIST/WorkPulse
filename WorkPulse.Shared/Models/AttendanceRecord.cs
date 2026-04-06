using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class AttendanceRecord
{
    public DateOnly Date { get; set; }

    [JsonIgnore]
    public DayOfWeek DayOfWeek => Date.DayOfWeek;

    public DayType DayType { get; set; } = DayType.WorkDay;
    public string? HolidayName { get; set; }
    public TripCategory? TripCategory { get; set; }
    public string? TripRegion { get; set; }

    public TimeOnly? LoginTime { get; set; }
    public TimeOnly? LogoutTime { get; set; }

    public int OvertimeHours { get; set; }
    public int OvertimeMinutes { get; set; }
    public bool IsOvertime { get; set; }

    // Tracks whether the user has explicitly set the OT field (Yes or No)
    public bool IsOvertimeDecided { get; set; }

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
    public bool IsNonWorkDay => DayType != DayType.WorkDay;

    [JsonIgnore]
    public string LoginDisplay => DayType switch
    {
        DayType.WorkDay when LoginTime.HasValue => LoginTime.Value.ToString("H:mm"),
        DayType.AnnualPaidLeave => HolidayName ?? "年休",
        DayType.UnpaidLeave => HolidayName ?? "休み",
        DayType.PublicHoliday => HolidayName ?? "休日",
        DayType.Weekend => HolidayName ?? "---",
        DayType.BusinessTrip => FormatBusinessTripDisplay(),
        _ => ""
    };

    [JsonIgnore]
    public string LogoutDisplay => DayType == DayType.WorkDay && LogoutTime.HasValue
        ? LogoutTime.Value.ToString("H:mm")
        : "";

    [JsonIgnore]
    public string OvertimeHoursDisplay =>
        DayType != DayType.WorkDay || !IsOvertimeDecided ? ""
        : IsOvertime ? OvertimeHours.ToString()
        : "N/A";

    [JsonIgnore]
    public string OvertimeMinutesDisplay =>
        DayType != DayType.WorkDay || !IsOvertimeDecided ? ""
        : IsOvertime ? OvertimeMinutes.ToString()
        : "N/A";

    [JsonIgnore]
    public string OvertimeFlag =>
        DayType != DayType.WorkDay ? ""
        : !IsOvertimeDecided ? ""
        : IsOvertime ? "YES" : "NO";

    [JsonIgnore]
    public bool IsOvertimePending =>
        DayType == DayType.WorkDay && LoginTime.HasValue && LogoutTime.HasValue && !IsOvertimeDecided;

    [JsonIgnore]
    public string SearchText =>
        $"{Date:yyyy-MM-dd} {DayAbbreviation} {DayOfWeek} {DayType} {HolidayName} {TripRegion} {LoginDisplay} {LogoutDisplay} {OvertimeFlag}"
            .ToLowerInvariant();

    private string FormatBusinessTripDisplay()
    {
        var tripLabel = TripCategory switch
        {
            Models.TripCategory.Domestic => "国内出張",
            Models.TripCategory.Overseas => "海外出張",
            _ => "出張"
        };

        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(TripRegion))
            parts.Add(TripRegion);
        if (!string.IsNullOrWhiteSpace(HolidayName))
            parts.Add(HolidayName);
        parts.Add(tripLabel);

        return string.Join(" ", parts);
    }
}
