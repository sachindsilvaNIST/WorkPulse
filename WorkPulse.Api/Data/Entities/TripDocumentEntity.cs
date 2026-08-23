namespace WorkPulse.Api.Data.Entities;

public class TripDocumentEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TripReportId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Category { get; set; } = "Other";
    public string Label { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public byte[] Content { get; set; } = Array.Empty<byte>();
    public DateTime UploadedUtc { get; set; } = DateTime.UtcNow;
    /// <summary>The document's own date (e.g. receipt/invoice date) — distinct from UploadedUtc,
    /// which is when it was added to WorkPulse. Nullable: documents uploaded before this field
    /// existed, or where the date wasn't specified, simply don't have one.</summary>
    public DateOnly? DocumentDate { get; set; }

    // Google Drive mirror — set once the local copy (the guaranteed, always-written backup) has
    // also been uploaded to Drive. Null means either Drive isn't connected or the mirror upload
    // failed; either way the local Content bytes remain the source of truth for downloads.
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }

    public TripReportEntity TripReport { get; set; } = null!;
}
