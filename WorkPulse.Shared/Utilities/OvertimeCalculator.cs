using System;

namespace WorkPulse.Services;

public static class OvertimeCalculator
{
    public static readonly TimeOnly StandardLogout = new(17, 30);
    public const int BreakDeductionMinutes = 20;

    public static (bool IsOvertime, int Hours, int Minutes) Calculate(
        TimeOnly? loginTime, TimeOnly? logoutTime)
    {
        if (loginTime is null || logoutTime is null)
            return (false, 0, 0);

        if (logoutTime.Value <= StandardLogout)
            return (false, 0, 0);

        var overtime = logoutTime.Value - StandardLogout;
        int totalMinutes = (int)overtime.TotalMinutes;

        // Deduct 20-minute break from overtime
        totalMinutes -= BreakDeductionMinutes;

        if (totalMinutes <= 0)
            return (false, 0, 0);

        return (true, totalMinutes / 60, totalMinutes % 60);
    }
}
