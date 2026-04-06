using Microsoft.AspNetCore.Identity;

namespace WorkPulse.Api.Data.Entities;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = "";
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryUtc { get; set; }

    public ICollection<AttendanceMonthEntity> AttendanceMonths { get; set; } = new List<AttendanceMonthEntity>();
    public ICollection<ContactEntity> Contacts { get; set; } = new List<ContactEntity>();
    public UserSettingsEntity? Settings { get; set; }
}
