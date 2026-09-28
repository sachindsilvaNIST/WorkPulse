namespace WorkPulse.Api.Data.Entities;

/// <summary>One row of a Trip Application's repeatable "Trip Details" table — a single
/// destination/purpose/date segment within a (possibly multi-city) trip. Embedded inside
/// TripReportEntity.Segments — no longer a top-level collection.</summary>
public class TripSegmentEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public int SequenceNo { get; set; }
    public string Purpose { get; set; } = "";
    public string Content { get; set; } = "";
    public string ProjectNo { get; set; } = "";
    public string DestinationName { get; set; } = "";
    public string PlaceName { get; set; } = "";
    public DateOnly? Date1 { get; set; }
    public DateOnly? Date2 { get; set; }
}
