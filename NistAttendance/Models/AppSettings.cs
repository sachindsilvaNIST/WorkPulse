using System;

namespace NistAttendance.Models;

public class AppSettings
{
    public TimeOnly StandardLoginTime { get; set; } = new(8, 20);
    public TimeOnly StandardLogoutTime { get; set; } = new(17, 25);
    public int OvertimeBreakDeductionMinutes { get; set; } = 20;
    public string DefaultTitle { get; set; } = "MSW SETTLEMENT";
    public string? LastOpenedMonth { get; set; }
}
