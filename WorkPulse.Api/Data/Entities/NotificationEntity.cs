namespace WorkPulse.Api.Data.Entities;

/// <summary>
/// A generated, in-app notification, optionally also delivered by email (see
/// NotificationTriggerService). DedupeKey ("DailyReportReminder:2026-08-28",
/// "TripUpcoming:{tripId}", ...) is unique per user so the background scheduler can run
/// repeatedly without ever re-notifying for the same event.
/// </summary>
public class NotificationEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string? Href { get; set; }
    public string DedupeKey { get; set; } = "";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReadUtc { get; set; }

    public AppUser User { get; set; } = null!;
}
