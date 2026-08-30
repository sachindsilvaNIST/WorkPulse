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
    public TripStatus Status { get; set; } = TripStatus.Planned;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    /// <summary>How many documents (reimbursement receipts/invoices/etc.) are linked to this
    /// trip — populated by TripReportsController.GetAll so Business Trips can show it on each
    /// trip card without a separate request per trip.</summary>
    public int DocumentCount { get; set; }

    [JsonIgnore]
    public string SearchText => $"{Destination} {Purpose} {Notes} {Category}".ToLowerInvariant();
}
