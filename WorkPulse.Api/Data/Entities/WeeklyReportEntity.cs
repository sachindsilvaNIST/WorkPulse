namespace WorkPulse.Api.Data.Entities;

public class WeeklyReportEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public DateOnly WeekStartDate { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
