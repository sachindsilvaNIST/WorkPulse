using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Services;

/// <summary>
/// Generates in-app notifications (and best-effort emails, per each user's NotificationChannel
/// preference) for a couple of concrete, recurring events. Timing is JST (Asia/Tokyo, UTC+9, no
/// DST) rather than UTC — there's no per-user timezone stored, so this is a single hardcoded zone
/// for now rather than a real per-user setting. Every notification carries a DedupeKey unique per
/// user, so calling these methods repeatedly on a timer never double-notifies.
/// </summary>
public class NotificationTriggerService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<NotificationTriggerService> _logger;

    // "Asia/Tokyo" (IANA) resolves on Linux/macOS; .NET also maps it to Windows' "Tokyo Standard
    // Time" automatically, so this works the same locally and on Render.
    private static readonly TimeZoneInfo JstZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tokyo");

    // Only fire the "no report yet today" reminder from this JST hour onward, so it doesn't nag
    // early risers mid-morning about a report they'd write later the same day anyway.
    private const int DailyReportReminderHourJst = 18;

    public NotificationTriggerService(AppDbContext db, IEmailSender emailSender, ILogger<NotificationTriggerService> logger)
    {
        _db = db;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task RunAllAsync()
    {
        var nowJst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, JstZone);

        if (nowJst.Hour >= DailyReportReminderHourJst)
        {
            await GenerateDailyReportRemindersAsync(DateOnly.FromDateTime(nowJst));
        }
        await GenerateTripRemindersAsync(DateOnly.FromDateTime(nowJst).AddDays(1));
    }

    private async Task GenerateDailyReportRemindersAsync(DateOnly today)
    {
        var dedupePrefix = $"DailyReportReminder:{today:yyyy-MM-dd}";

        var users = await _db.Users
            .Include(u => u.Settings)
            .Where(u => u.Settings == null || u.Settings.NotificationsEnabled)
            .ToListAsync();

        foreach (var user in users)
        {
            var dedupeKey = $"{dedupePrefix}:{user.Id}";
            var alreadySent = await _db.Notifications.AnyAsync(n => n.UserId == user.Id && n.DedupeKey == dedupeKey);
            if (alreadySent) continue;

            var hasToday = await _db.DailyReports.AnyAsync(r => r.UserId == user.Id && r.ReportDate == today);
            if (hasToday) continue;

            await CreateAsync(
                user,
                type: "DailyReportReminder",
                title: "Today's report is still empty",
                message: "You haven't filled in a daily report yet today.",
                href: "/reports/daily",
                dedupeKey: dedupeKey
            );
        }
    }

    private async Task GenerateTripRemindersAsync(DateOnly tomorrow)
    {
        var upcomingTrips = await _db.TripReports
            .Include(t => t.User).ThenInclude(u => u.Settings)
            .Where(t => t.StartDate == tomorrow)
            .ToListAsync();

        foreach (var trip in upcomingTrips)
        {
            if (trip.User.Settings is { NotificationsEnabled: false }) continue;

            var dedupeKey = $"TripUpcoming:{trip.Id}";
            var alreadySent = await _db.Notifications.AnyAsync(n => n.UserId == trip.UserId && n.DedupeKey == dedupeKey);
            if (alreadySent) continue;

            await CreateAsync(
                trip.User,
                type: "TripUpcoming",
                title: "Trip starts tomorrow",
                message: $"Your trip to {trip.Destination} starts tomorrow.",
                href: "/trips",
                dedupeKey: dedupeKey
            );
        }
    }

    private async Task CreateAsync(AppUser user, string type, string title, string message, string href, string dedupeKey)
    {
        _db.Notifications.Add(new NotificationEntity
        {
            UserId = user.Id,
            Type = type,
            Title = title,
            Message = message,
            Href = href,
            DedupeKey = dedupeKey
        });
        await _db.SaveChangesAsync();

        var channel = user.Settings?.NotificationChannel ?? "Email";
        if (channel != "Email" || string.IsNullOrEmpty(user.Email)) return;

        try
        {
            await _emailSender.SendAsync(user.Email, title, message);
        }
        catch (Exception ex)
        {
            // Best-effort, matching the rest of the app's email sends (2FA codes, registration
            // codes) — a delivery failure shouldn't ever block the in-app notification that was
            // already saved above.
            _logger.LogWarning(ex, "Failed to email notification {Type} to {UserId}", type, user.Id);
        }
    }
}
