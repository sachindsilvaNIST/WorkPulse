namespace WorkPulse.Api.Data.Entities;

public class AttendanceMonthEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthLabel { get; set; } = "";
    public string Title { get; set; } = "";

    // Overrides the default 21st-to-20th (weekend-adjusted) settlement window computed
    // client-side — set only when the user has explicitly customized this settlement period.
    // Null means "use the default calculation."
    public DateOnly? CustomSettlementStart { get; set; }
    public DateOnly? CustomSettlementEnd { get; set; }

    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<AttendanceRecordEntity> Records { get; set; } = new List<AttendanceRecordEntity>();
}
