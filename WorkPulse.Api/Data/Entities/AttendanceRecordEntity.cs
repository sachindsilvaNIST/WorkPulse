namespace WorkPulse.Api.Data.Entities;

public class AttendanceRecordEntity
{
    public int Id { get; set; }
    public int MonthId { get; set; }
    public DateOnly Date { get; set; }
    public string DayType { get; set; } = "WorkDay";
    public string? HolidayName { get; set; }
    public string? TripCategory { get; set; }
    public string? TripRegion { get; set; }
    public int? LeaveHours { get; set; }
    public int? LeaveMinutes { get; set; }
    public TimeOnly? LoginTime { get; set; }
    public TimeOnly? LogoutTime { get; set; }
    public int OvertimeHours { get; set; }
    public int OvertimeMinutes { get; set; }
    public bool IsOvertime { get; set; }
    public bool IsOvertimeDecided { get; set; }

    public AttendanceMonthEntity Month { get; set; } = null!;
}
