namespace WorkPulse.Api.Data.Entities;

/// <summary>
/// One issued refresh token = one session. Replaces AppUser.RefreshToken (kept, unused, for
/// backward compat) as the source of truth for login/refresh — this lets a user hold multiple
/// concurrent sessions (different devices/browsers) and revoke them individually.
/// </summary>
public class UserSessionEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public string DeviceLabel { get; set; } = "";
    public string? IpAddress { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastUsedUtc { get; set; }
    public DateTime ExpiresUtc { get; set; }

    public AppUser User { get; set; } = null!;
}
