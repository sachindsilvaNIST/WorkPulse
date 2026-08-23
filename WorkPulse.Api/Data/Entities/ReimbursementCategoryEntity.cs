namespace WorkPulse.Api.Data.Entities;

/// <summary>User-created, reusable document category (Invoice, Receipt, etc.) — replaces the
/// old hardcoded DocCategory enum. Deliberately not a strict FK on TripDocumentEntity.Category
/// (which stays a free string): documents created before a category existed, or after its row
/// was deleted, still display their category text correctly with no orphaned-reference cleanup.</summary>
public class ReimbursementCategoryEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
