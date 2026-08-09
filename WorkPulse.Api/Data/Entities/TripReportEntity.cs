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
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<TripDocumentEntity> Documents { get; set; } = new List<TripDocumentEntity>();
}
