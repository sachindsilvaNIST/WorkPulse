namespace WorkPulse.Models;

/// <summary>One row of a Trip Application's repeatable "Trip Details" table.</summary>
public class TripSegment
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
