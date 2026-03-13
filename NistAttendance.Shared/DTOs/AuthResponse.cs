using System;

namespace NistAttendance.DTOs;

public class AuthResponse
{
    public string Token { get; set; } = "";
    public string RefreshToken { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public string DisplayName { get; set; } = "";
}
