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

    public TripReportEntity TripReport { get; set; } = null!;
}
