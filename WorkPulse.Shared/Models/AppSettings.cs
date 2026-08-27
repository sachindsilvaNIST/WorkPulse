using System;

namespace WorkPulse.Models;

public class AppSettings
{
    public TimeOnly StandardLoginTime { get; set; } = new(8, 25);
    public TimeOnly StandardLogoutTime { get; set; } = new(17, 30);
    public int OvertimeBreakDeductionMinutes { get; set; } = 20;
    public string DefaultTitle { get; set; } = "MSW SETTLEMENT";
    public string? LastOpenedMonth { get; set; }

    // Theme and display settings
    public string ThemeVariant { get; set; } = "Light";
    public string FontSizePreset { get; set; } = "Medium";
    public string DateFormat { get; set; } = "MM/dd/yyyy";

    // Calendar / navigation
    public string WeekStartDay { get; set; } = "Monday";
    public string DefaultLandingPage { get; set; } = "/home";

    // Session behavior
    /// <summary>Minutes of inactivity before auto-logout. 0 = disabled.</summary>
    public int IdleTimeoutMinutes { get; set; } = 0;

    // Notifications (preference only — no send mechanism exists yet, see project notes)
    public bool NotificationsEnabled { get; set; } = true;
    public string NotificationChannel { get; set; } = "Email";

    // Sync settings (desktop only, not synced to server)
    public bool SyncEnabled { get; set; }
    public string SyncServerUrl { get; set; } = "";
    public string SyncEmail { get; set; } = "";
    public string? SyncToken { get; set; }
    public string? SyncRefreshToken { get; set; }
    public DateTime LastSyncedAtUtc { get; set; } = DateTime.MinValue;

    // Local save directory (desktop only, not synced to server — a Windows/Linux
    // folder path has no meaning on the web app or the server itself)
    public string DefaultReportsDirectory { get; set; } = "";
}
