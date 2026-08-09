using System;

namespace WorkPulse.Models;

public class AppSettings
{
    public TimeOnly StandardLoginTime { get; set; } = new(8, 20);
    public TimeOnly StandardLogoutTime { get; set; } = new(17, 25);
    public int OvertimeBreakDeductionMinutes { get; set; } = 20;
    public string DefaultTitle { get; set; } = "MSW SETTLEMENT";
    public string? LastOpenedMonth { get; set; }

    // Theme and display settings
    public string ThemeVariant { get; set; } = "Light";
    public string FontSizePreset { get; set; } = "Medium";

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
