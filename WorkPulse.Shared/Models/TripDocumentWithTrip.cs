using System;

namespace WorkPulse.Models;

/// <summary>A document plus enough of its parent trip's context to display/search
/// across all trips at once (the "Reimbursement" document library).</summary>
public class TripDocumentWithTrip
{
    public string Id { get; set; } = "";
    public string TripReportId { get; set; } = "";
    public DocCategory Category { get; set; } = DocCategory.Other;
    public string Label { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime UploadedUtc { get; set; }

    public string TripDestination { get; set; } = "";
    public TripCategory TripCategory { get; set; } = TripCategory.Domestic;
    public DateOnly TripStartDate { get; set; }
    public DateOnly TripEndDate { get; set; }
}
