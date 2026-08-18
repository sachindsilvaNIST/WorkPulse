namespace WorkPulse.Models;

public enum DayType
{
    WorkDay,
    HalfDayLeave,     // 半休
    AMLeave,          // 午前休
    PMLeave,          // 午後休
    HourlyLeave,      // 時間休
    AnnualPaidLeave,  // 年休
    UnpaidLeave,      // 休み
    PublicHoliday,    // 休日
    Weekend,          // 土・日曜日
    BusinessTrip,     // 出張
    Other             // その他
}
