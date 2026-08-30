using System;

namespace WorkPulse.Models;

public class TripDocumentMeta
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TripReportId { get; set; } = "";
    /// <summary>User-defined, DB-backed category name (see ReimbursementCategoryEntity) — no
    /// longer a fixed enum, so any string the user has created is valid.</summary>
    public string Category { get; set; } = "";
    public string Label { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime UploadedUtc { get; set; }
    public DateOnly? DocumentDate { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public ReimbursementStatus ReimbursementStatus { get; set; } = ReimbursementStatus.Pending;
    public string? ResourceId { get; set; }
}
