namespace WorkPulse.Api.Data.Entities;

/// <summary>One person a Share has been granted to by email — matched against the recipient's own
/// account email at request time, not a stored UserId, since the person may not have an account
/// yet when they're invited (they just need one by the time they actually sign in and view it).</summary>
public class ShareGrantEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ShareId { get; set; } = "";
    public string Email { get; set; } = "";
    /// <summary>"Read" | "Edit".</summary>
    public string Permission { get; set; } = "Read";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public ShareEntity Share { get; set; } = null!;
}
