using WorkPulse.Models;

namespace WorkPulse.Api.Services;

public static class UtilityBillStatusCalculator
{
    private static readonly TimeZoneInfo JstZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tokyo");

    public static DateOnly TodayJst(DateTime? nowUtc = null) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc ?? DateTime.UtcNow, JstZone));

    public static UtilityBillStatus Compute(DateOnly? paidDate, DateOnly dueDate, DateTime? nowUtc = null)
    {
        if (paidDate.HasValue) return UtilityBillStatus.Paid;
        return TodayJst(nowUtc) > dueDate ? UtilityBillStatus.Overdue : UtilityBillStatus.Unpaid;
    }
}
