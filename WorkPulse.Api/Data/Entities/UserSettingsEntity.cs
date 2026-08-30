namespace WorkPulse.Api.Data.Entities;

public class UserSettingsEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public TimeOnly StandardLoginTime { get; set; } = new(8, 25);
    public TimeOnly StandardLogoutTime { get; set; } = new(17, 30);
    public int OvertimeBreakDeductionMinutes { get; set; } = 20;
    public string DefaultTitle { get; set; } = "MSW SETTLEMENT";
    public string? LastOpenedMonth { get; set; }
    public string ThemeVariant { get; set; } = "Light";
    public string FontSizePreset { get; set; } = "Medium";
    public string DateFormat { get; set; } = "MM/dd/yyyy";
    public string WeekStartDay { get; set; } = "Monday";
    public string DefaultLandingPage { get; set; } = "/home";
    public int IdleTimeoutMinutes { get; set; } = 0;
    public bool NotificationsEnabled { get; set; } = true;
    public string NotificationChannel { get; set; } = "Email";
    public string AccentColor { get; set; } = "blue";

    public AppUser User { get; set; } = null!;
}
