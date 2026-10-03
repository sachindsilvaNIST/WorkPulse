using System;

namespace WorkPulse.Models;

public class UtilityBillDocumentMeta
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UtilityBillId { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime UploadedUtc { get; set; }
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
}
