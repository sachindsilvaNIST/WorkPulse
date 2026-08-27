namespace WorkPulse.Api.Data.Entities;

/// <summary>A saved link, uploaded file, or free-form note kept for future reference (e.g. a visa
/// application guide) — one entity for all three so browsing/search treats them as one unified
/// pile, not three disconnected sections. Tags and Keywords are both free-text (comma-separated),
/// matching QuickLinkEntity's precedent rather than a managed/reusable tag entity — Tags are the
/// user-visible chips, Keywords are extra search-boosting terms that don't need their own chip.</summary>
public class ResourceEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "Note"; // "Link" | "File" | "Note"
    public string Title { get; set; } = "";
    public string Notes { get; set; } = "";
    public string? Url { get; set; } // Link only
    public string FileName { get; set; } = ""; // File only
    public string ContentType { get; set; } = ""; // File only
    public long SizeBytes { get; set; } // File only
    public byte[] Content { get; set; } = Array.Empty<byte>(); // File only
    // Google Drive mirror (File only) — same best-effort pattern as TripDocumentEntity: the local
    // Content bytes above are the guaranteed copy, this is set only once a mirror upload succeeds.
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
    public string Tags { get; set; } = "";
    public string Keywords { get; set; } = "";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
