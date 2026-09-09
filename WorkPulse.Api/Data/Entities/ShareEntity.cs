namespace WorkPulse.Api.Data.Entities;

/// <summary>One row per shared item — loosely references the shared item by (ResourceType,
/// ResourceId) rather than a real FK, same convention as TripDocumentEntity.ResourceId already
/// uses for its own cross-table reference: the shared thing can be any of several entity types,
/// so a single typed FK column per type isn't practical, and an owner deleting the underlying item
/// just leaves this row harmlessly orphaned rather than requiring a cascade across seven tables.</summary>
public class ShareEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string OwnerUserId { get; set; } = "";

    /// <summary>"TripReport" | "TripDocument" | "DailyReport" | "WeeklyReport" | "Contact" |
    /// "QuickLink" | "Resource" — matches the shared item's own entity name.</summary>
    public string ResourceType { get; set; } = "";
    public string ResourceId { get; set; } = "";

    public bool IsPublic { get; set; }
    /// <summary>"Read" | "Edit" — only meaningful while IsPublic is true.</summary>
    public string PublicPermission { get; set; } = "Read";
    /// <summary>The entire access control for a public share — null whenever IsPublic is false.
    /// Random (RandomNumberGenerator), never a sequential id, and always nulled out on revoke so
    /// an old link can never come back to life by re-enabling IsPublic later.</summary>
    public string? PublicToken { get; set; }

    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public AppUser Owner { get; set; } = null!;
    public ICollection<ShareGrantEntity> Grants { get; set; } = new List<ShareGrantEntity>();
}
