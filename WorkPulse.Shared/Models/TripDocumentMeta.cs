using System;

namespace WorkPulse.Models;

/// <summary>Document metadata only — file bytes are fetched separately via a download endpoint.</summary>
public class TripDocumentMeta
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TripReportId { get; set; } = "";
    public DocCategory Category { get; set; } = DocCategory.Other;
    public string Label { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime UploadedUtc { get; set; }
}
