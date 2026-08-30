namespace WorkPulse.Api.Data.Entities;

public class TripReportEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Category { get; set; } = "Domestic";
    public string Destination { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Purpose { get; set; } = "";
    public string Notes { get; set; } = "";
    /// <summary>"Planned" | "InProgress" | "Completed" — a lightweight status, not a full workflow
    /// (no approval step, nothing server-enforced); just lets a trip read as more than a date range.</summary>
    public string Status { get; set; } = "Planned";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<TripDocumentEntity> Documents { get; set; } = new List<TripDocumentEntity>();
}
