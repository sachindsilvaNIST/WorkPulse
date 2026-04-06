using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class MonthlyData
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthLabel { get; set; } = "";
    public string Title { get; set; } = "";
    public List<AttendanceRecord> Records { get; set; } = new();

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public int TotalWorkDays => Records.Count(r => r.DayType == DayType.WorkDay && r.LoginTime.HasValue);

    [JsonIgnore]
    public int OvertimeCount => Records.Count(r => r.IsOvertime);

    [JsonIgnore]
    public (int Hours, int Minutes) TotalOvertimeDuration
    {
        get
        {
            var totalMin = Records.Where(r => r.IsOvertime)
                .Sum(r => r.OvertimeHours * 60 + r.OvertimeMinutes);
            return (totalMin / 60, totalMin % 60);
        }
    }

    [JsonIgnore]
    public string TotalOvertimeDisplay
    {
        get
        {
            var (h, m) = TotalOvertimeDuration;
            return $"{h} Hr {m} Min";
        }
    }
}
