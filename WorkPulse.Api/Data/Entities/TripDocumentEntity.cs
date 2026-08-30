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

    // Expense tracking — nullable since not every document is a receipt (e.g. an itinerary or
    // confirmation email has no amount). A trip's total is computed client-side from these, not
    // stored, so there's nothing to keep in sync when a document is added/edited/removed.
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "USD";

    /// <summary>"Pending" | "Submitted" | "Reimbursed" — surfaced on the Reimbursement page (this
    /// entity IS what Reimbursement lists, viewed cross-trip), edited from either page.</summary>
    public string ReimbursementStatus { get; set; } = "Pending";

    /// <summary>Loose reference to a Resources entry (ResourceEntity.Id) — unenforced at the DB
    /// level, same as DriveFileId above; a deleted Resource just leaves a dangling id here rather
    /// than requiring a cascade or blocking the delete.</summary>
    public string? ResourceId { get; set; }

    public TripReportEntity TripReport { get; set; } = null!;
}
