namespace WorkPulse.Api.Data.Entities;

/// <summary>One row per user who has connected their Google Drive. The refresh token is
/// long-lived (until revoked); the access token is short-lived and refreshed on demand by
/// GoogleDriveService — see AccessTokenExpiryUtc.</summary>
public class GoogleDriveConnectionEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string? AccessToken { get; set; }
    public DateTime? AccessTokenExpiryUtc { get; set; }
    /// <summary>Cached ID of the "WorkPulse Reimbursements" Drive folder, created on first
    /// upload so subsequent uploads don't need to search for it every time.</summary>
    public string? DriveFolderId { get; set; }
    public DateTime ConnectedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
