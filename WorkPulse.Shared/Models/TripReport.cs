using System;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class TripReport
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public TripCategory Category { get; set; } = TripCategory.Domestic;
    public string Destination { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Purpose { get; set; } = "";
    public string Notes { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public string SearchText => $"{Destination} {Purpose} {Notes} {Category}".ToLowerInvariant();
}
