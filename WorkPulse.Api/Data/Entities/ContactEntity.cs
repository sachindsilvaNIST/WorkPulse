namespace WorkPulse.Api.Data.Entities;

public class ContactEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Affiliation { get; set; } = "";
    public string FamilyName { get; set; } = "";
    public string GivenName { get; set; } = "";
    public string Department { get; set; } = "";
    public string Email { get; set; } = "";
    public string Intercom { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
