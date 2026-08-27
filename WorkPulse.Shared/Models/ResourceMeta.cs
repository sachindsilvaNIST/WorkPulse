using System;

namespace WorkPulse.Models;

/// <summary>Same split as TripDocumentMeta/TripDocumentEntity — the file's bytes never travel in
/// list responses, only via the dedicated download endpoint.</summary>
public class ResourceMeta
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Type { get; set; } = "Note";
    public string Title { get; set; } = "";
    public string Notes { get; set; } = "";
    public string? Url { get; set; }
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
    public string Tags { get; set; } = "";
    public string Keywords { get; set; } = "";
    public DateTime CreatedUtc { get; set; }
    public DateTime LastModifiedUtc { get; set; }
}
