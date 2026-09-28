using Microsoft.AspNetCore.Identity;
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
    private readonly UserManager<AppUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<NotificationTriggerService> _logger;

    // "Asia/Tokyo" (IANA) resolves on Linux/macOS; .NET also maps it to Windows' "Tokyo Standard
    // Time" automatically, so this works the same locally and on Render.
    private static readonly TimeZoneInfo JstZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Tokyo");

    // Only fire the "no report yet today" reminder from this JST hour onward, so it doesn't nag
    // early risers mid-morning about a report they'd write later the same day anyway.
    private const int DailyReportReminderHourJst = 18;

    public NotificationTriggerService(AppDbContext db, UserManager<AppUser> userManager, IEmailSender emailSender, ILogger<NotificationTriggerService> logger)
    {
        _db = db;
        _userManager = userManager;
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

        // Identity (AppUser) and UserSettingsEntity live in separate stores now — fetch both and
        // join in-memory (tiny dataset for a single-user app).
        var users = _userManager.Users.ToList();
        var settingsByUserId = (await _db.UserSettings.ToListAsync()).ToDictionary(s => s.UserId);

        foreach (var user in users)
        {
            settingsByUserId.TryGetValue(user.Id, out var settings);
            if (settings is { NotificationsEnabled: false }) continue;

            var dedupeKey = $"{dedupePrefix}:{user.Id}";
            var alreadySent = await _db.Notifications.AnyAsync(n => n.UserId == user.Id && n.DedupeKey == dedupeKey);
            if (alreadySent) continue;

            var hasToday = await _db.DailyReports.AnyAsync(r => r.UserId == user.Id && r.ReportDate == today);
            if (hasToday) continue;

            await CreateAsync(
                user.Id, user.Email, settings?.NotificationChannel,
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
            .Where(t => t.StartDate == tomorrow)
            .ToListAsync();

        var settingsByUserId = (await _db.UserSettings.ToListAsync()).ToDictionary(s => s.UserId);

        foreach (var trip in upcomingTrips)
        {
            settingsByUserId.TryGetValue(trip.UserId, out var settings);
            if (settings is { NotificationsEnabled: false }) continue;

            var dedupeKey = $"TripUpcoming:{trip.Id}";
            var alreadySent = await _db.Notifications.AnyAsync(n => n.UserId == trip.UserId && n.DedupeKey == dedupeKey);
            if (alreadySent) continue;

            var user = await _userManager.FindByIdAsync(trip.UserId);
            if (user == null) continue;

            await CreateAsync(
                trip.UserId, user.Email, settings?.NotificationChannel,
                type: "TripUpcoming",
                title: "Trip starts tomorrow",
                message: $"Your trip to {trip.Destination} starts tomorrow.",
                href: "/trips",
                dedupeKey: dedupeKey
            );
        }
    }

    private async Task CreateAsync(string userId, string? userEmail, string? notificationChannel, string type, string title, string message, string href, string dedupeKey)
    {
        _db.Notifications.Add(new NotificationEntity
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            Href = href,
            DedupeKey = dedupeKey
        });
        await _db.SaveChangesAsync();

        var channel = notificationChannel ?? "Email";
        if (channel != "Email" || string.IsNullOrEmpty(userEmail)) return;

        try
        {
            await _emailSender.SendAsync(userEmail, title, message);
        }
        catch (Exception ex)
        {
            // Best-effort, matching the rest of the app's email sends (2FA codes, registration
            // codes) — a delivery failure shouldn't ever block the in-app notification that was
            // already saved above.
            _logger.LogWarning(ex, "Failed to email notification {Type} to {UserId}", type, userId);
        }
    }
}
