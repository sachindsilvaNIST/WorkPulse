namespace WorkPulse.Api.Data.Entities;

public class UserSettingsEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public TimeOnly StandardLoginTime { get; set; } = new(8, 20);
    public TimeOnly StandardLogoutTime { get; set; } = new(17, 25);
    public int OvertimeBreakDeductionMinutes { get; set; } = 20;
    public string DefaultTitle { get; set; } = "MSW SETTLEMENT";
    public string? LastOpenedMonth { get; set; }
    public string ThemeVariant { get; set; } = "Light";
    public string FontSizePreset { get; set; } = "Medium";

    public AppUser User { get; set; } = null!;
}
