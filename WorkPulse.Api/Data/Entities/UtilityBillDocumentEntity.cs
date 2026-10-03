namespace WorkPulse.Api.Data.Entities;

public class UtilityBillDocumentEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UtilityBillId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    /// <summary>GridFS file id — the bytes themselves live in GridFS, same as TripDocumentEntity.</summary>
    public string? ContentGridFsId { get; set; }
    public DateTime UploadedUtc { get; set; } = DateTime.UtcNow;
    public string? DriveFileId { get; set; }
    public string? DriveWebViewLink { get; set; }
}
