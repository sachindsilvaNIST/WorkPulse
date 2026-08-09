namespace WorkPulse.Api.Data.Entities;

public class QuickLinkEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Label { get; set; } = "";
    public string Url { get; set; } = "";
    public string Category { get; set; } = "";
    public string Keywords { get; set; } = "";
    public int SortOrder { get; set; }
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
