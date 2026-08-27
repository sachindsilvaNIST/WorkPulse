using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Services;
using WorkPulse.DTOs;

namespace WorkPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;

    public AuthController(UserManager<AppUser> userManager, AppDbContext db, IEmailSender emailSender, IConfiguration config)
    {
        _userManager = userManager;
        _db = db;
        _emailSender = emailSender;
        _config = config;
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(await IssueTokensAsync(user));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResult>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { error = "Invalid email or password" });

        // CheckPasswordAsync alone doesn't enforce lockout — that's normally SignInManager's job,
        // but this controller issues JWTs directly rather than using SignInManager, so an
        // admin-disabled account (AdminController sets LockoutEnd) could otherwise still log in.
        if (await _userManager.IsLockedOutAsync(user))
            return Unauthorized(new { error = "This account has been disabled." });

        if (await _userManager.GetTwoFactorEnabledAsync(user))
        {
            await SendTwoFactorCodeAsync(user);
            return Ok(new LoginResult { RequiresTwoFactor = true, Email = user.Email! });
        }

        return Ok(new LoginResult { Auth = await IssueTokensAsync(user) });
    }

    [HttpPost("login/verify-2fa")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> VerifyTwoFactorLogin(TwoFactorVerifyRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null) return Unauthorized(new { error = "Invalid or expired code." });

        if (await _userManager.IsLockedOutAsync(user))
            return Unauthorized(new { error = "This account has been disabled." });

        var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, request.Code);
        if (!valid) return Unauthorized(new { error = "Invalid or expired code." });

        return Ok(await IssueTokensAsync(user));
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.Token);
        if (principal == null)
            return Unauthorized(new { error = "Invalid token" });

        var email = principal.FindFirstValue(ClaimTypes.Email);
        if (email == null)
            return Unauthorized(new { error = "Invalid token" });

        var user = await _userManager.FindByEmailAsync(email);
        var session = user == null
            ? null
            : await _db.UserSessions.FirstOrDefaultAsync(s => s.UserId == user.Id && s.RefreshToken == request.RefreshToken);
        if (user == null || session == null || session.ExpiresUtc <= DateTime.UtcNow)
            return Unauthorized(new { error = "Invalid or expired refresh token" });

        // Same lockout gap as Login: a disabled account could otherwise keep renewing its access
        // token via a still-valid refresh token, staying signed in indefinitely.
        if (await _userManager.IsLockedOutAsync(user))
            return Unauthorized(new { error = "This account has been disabled." });

        _db.UserSessions.Remove(session);
        var response = await IssueTokensAsync(user);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.UserId == userId && s.RefreshToken == request.RefreshToken);
        if (session != null)
        {
            _db.UserSessions.Remove(session);
            await _db.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserDto>> Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        return Ok(new CurrentUserDto
        {
            Email = user.Email ?? "",
            DisplayName = user.DisplayName,
            TwoFactorEnabled = user.TwoFactorEnabled
        });
    }

    // ===== Profile self-service (display name, password, account deletion) =====

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<CurrentUserDto>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        var displayName = (request.DisplayName ?? "").Trim();
        if (displayName.Length == 0) return BadRequest(new { error = "Display name is required." });

        user.DisplayName = displayName;
        await _userManager.UpdateAsync(user);

        return Ok(new CurrentUserDto { Email = user.Email ?? "", DisplayName = user.DisplayName, TwoFactorEnabled = user.TwoFactorEnabled });
    }

    [HttpPost("change-password")]
    [EnableRateLimiting("auth")]
    [Authorize]
    public async Task<ActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok();
    }

    [HttpDelete("account")]
    [EnableRateLimiting("auth")]
    [Authorize]
    public async Task<ActionResult> DeleteAccount(DeleteAccountRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
            return BadRequest(new { error = "Incorrect password." });

        // Every user-owned table cascades on AspNetUsers.Id via ON DELETE CASCADE (see
        // AppDbContext.OnModelCreating), so this one call cleans up everything the user owns.
        await _userManager.DeleteAsync(user);
        return Ok();
    }

    // ===== Two-factor enable/disable (authenticated user managing their own account) =====

    [HttpPost("2fa/send-code")]
    [Authorize]
    public async Task<IActionResult> SendTwoFactorSetupCode()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        await SendTwoFactorCodeAsync(user);
        return Ok();
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> EnableTwoFactor(TwoFactorCodeRequest request)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        var valid = await _userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, request.Code);
        if (!valid) return BadRequest(new { error = "Invalid or expired code." });

        await _userManager.SetTwoFactorEnabledAsync(user, true);
        return Ok();
    }

    [HttpPost("2fa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableTwoFactor()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        return Ok();
    }

    private async Task SendTwoFactorCodeAsync(AppUser user)
    {
        var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
        await _emailSender.SendAsync(
            user.Email!,
            "Your WorkPulse verification code",
            $"Your verification code is: {code}\n\nThis code expires in a few minutes. If you didn't request this, you can ignore this email."
        );
    }

    private async Task<AuthResponse> IssueTokensAsync(AppUser user)
    {
        var secret = _config["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddDays(7);
        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.DisplayName)
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        // Per-user disabled features (admin-controlled). Admins are exempt: never disable for them.
        if (!roles.Contains("Admin") && !string.IsNullOrWhiteSpace(user.DisabledFeaturesCsv))
            claims.Add(new Claim("disabled_features", user.DisabledFeaturesCsv));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "WorkPulseApi",
            audience: _config["Jwt:Audience"] ?? "WorkPulseApp",
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        var refreshToken = GenerateRefreshToken();
        var now = DateTime.UtcNow;

        _db.UserSessions.Add(new UserSessionEntity
        {
            UserId = user.Id,
            RefreshToken = refreshToken,
            DeviceLabel = DescribeDevice(Request.Headers.UserAgent.ToString()),
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            CreatedUtc = now,
            LastUsedUtc = now,
            ExpiresUtc = now.AddDays(30)
        });
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            RefreshToken = refreshToken,
            ExpiresAt = expires,
            DisplayName = user.DisplayName
        };
    }

    /// <summary>Best-effort, human-readable device label from a User-Agent string — good enough
    /// to tell sessions apart in a list ("Chrome on macOS" vs "Safari on iPhone"), not meant to be
    /// a precise UA parser.</summary>
    private static string DescribeDevice(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return "Unknown device";

        string browser = userAgent switch
        {
            var ua when ua.Contains("Edg/") => "Edge",
            var ua when ua.Contains("Chrome/") => "Chrome",
            var ua when ua.Contains("Firefox/") => "Firefox",
            var ua when ua.Contains("Safari/") && !ua.Contains("Chrome") => "Safari",
            _ => "Browser"
        };

        string os = userAgent switch
        {
            var ua when ua.Contains("iPhone") => "iPhone",
            var ua when ua.Contains("iPad") => "iPad",
            var ua when ua.Contains("Android") => "Android",
            var ua when ua.Contains("Mac OS X") => "macOS",
            var ua when ua.Contains("Windows") => "Windows",
            var ua when ua.Contains("Linux") => "Linux",
            _ => "Unknown OS"
        };

        return $"{browser} on {os}";
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var secret = _config["Jwt:Secret"]!;
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = false,
            ValidIssuer = _config["Jwt:Issuer"] ?? "WorkPulseApi",
            ValidAudience = _config["Jwt:Audience"] ?? "WorkPulseApp",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
        };

        try
        {
            return new JwtSecurityTokenHandler().ValidateToken(token, parameters, out _);
        }
        catch
        {
            return null;
        }
    }
}

public class RefreshTokenRequest
{
    public string Token { get; set; } = "";
    public string RefreshToken { get; set; } = "";
}

public class LoginResult
{
    public bool RequiresTwoFactor { get; set; }
    public string? Email { get; set; }
    public AuthResponse? Auth { get; set; }
}

public class TwoFactorVerifyRequest
{
    public string Email { get; set; } = "";
    public string Code { get; set; } = "";
}

public class TwoFactorCodeRequest
{
    public string Code { get; set; } = "";
}

public class CurrentUserDto
{
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool TwoFactorEnabled { get; set; }
}

public class UpdateProfileRequest
{
    public string DisplayName { get; set; } = "";
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}

public class DeleteAccountRequest
{
    public string Password { get; set; } = "";
}
