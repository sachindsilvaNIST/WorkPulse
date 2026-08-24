namespace WorkPulse.Api.Data.Entities;

/// <summary>Local mirror of one Gmail label, kept in sync via full refresh (Stage 2) and later
/// push notifications (Stage 4) — never message content, just label metadata, so search/browse
/// is fast and doesn't hit the Gmail API on every keystroke.</summary>
public class GmailLabelEntity
{
    public int Id { get; set; }
    public int ConnectionId { get; set; }
    public string GmailLabelId { get; set; } = "";
    /// <summary>Gmail's own nesting convention — "Clients/Acme Corp" — parsed into a tree client-side.</summary>
    public string Name { get; set; } = "";
    /// <summary>"system" (INBOX, SENT, ...) or "user" — only "user" labels can be renamed/deleted,
    /// matching Gmail's own real restriction.</summary>
    public string Type { get; set; } = "user";
    public string? Color { get; set; }
    public DateTime LastSyncedUtc { get; set; } = DateTime.UtcNow;

    public GmailConnectionEntity Connection { get; set; } = null!;
}
