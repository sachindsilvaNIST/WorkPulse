namespace WorkPulse.Api.Data.Entities;

/// <summary>One row per user who has connected a Gmail account (kept separate from
/// GoogleDriveConnectionEntity — a distinct, more sensitive scope the user may want to revoke
/// independently, and typically a different Google account than Drive). HistoryId/WatchExpiryUtc
/// track the Gmail push-notification subscription used for real-time label sync.</summary>
public class GmailConnectionEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string? AccessToken { get; set; }
    public DateTime? AccessTokenExpiryUtc { get; set; }
    public string EmailAddress { get; set; } = "";
    /// <summary>Gmail's cursor into the mailbox's change history — history entries since this
    /// value are what GetHistorySinceAsync diffs into the local label mirror.</summary>
    public string? HistoryId { get; set; }
    /// <summary>Gmail watch() subscriptions expire after 7 days and must be renewed before then
    /// (GmailWatchRenewalService). Null until the first watch() call succeeds.</summary>
    public DateTime? WatchExpiryUtc { get; set; }
    public DateTime ConnectedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
}
