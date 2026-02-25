namespace NistAttendance.Models;

public enum DayType
{
    WorkDay,
    AnnualPaidLeave,  // 年休
    UnpaidLeave,      // 休み
    PublicHoliday,    // 休日
    Weekend,          // 土・日曜日
    Absent
}
