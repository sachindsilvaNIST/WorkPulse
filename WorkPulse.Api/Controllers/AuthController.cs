using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
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
    private readonly ILogger<AuthController> _logger;
    private readonly IMemoryCache _cache;

    public AuthController(UserManager<AppUser> userManager, AppDbContext db, IEmailSender emailSender, IConfiguration config, ILogger<AuthController> logger, IMemoryCache cache)
    {
        _userManager = userManager;
        _db = db;
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
        _cache = cache;
    }

    // Registering no longer touches AspNetUsers at all until the code is confirmed — the pending
    // signup (including the plaintext password, since it still needs to reach CreateAsync's own
    // hasher) lives only in this in-process cache, keyed by an opaque id handed to the client.
    // This is what makes an abandoned registration truly disappear (auto-expires) instead of
    // permanently squatting on that email address as an unconfirmed row forever.
    private const string PendingRegistrationPrefix = "pending-registration:";
    private static readonly TimeSpan PendingRegistrationLifetime = TimeSpan.FromMinutes(15);

    private record PendingRegistration(string Email, string DisplayName, string Password, string Code);

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<RegisterResult>> Register(RegisterRequest request)
    {
        var email = (request.Email ?? "").Trim();
        if (await _userManager.FindByEmailAsync(email) != null)
            return BadRequest(new { errors = new[] { "An account with this email already exists." } });

        // Runs the same password-strength rules CreateAsync would, without persisting anything —
        // the default validator only inspects the raw password string, so a transient,
        // never-saved AppUser is a safe stand-in for the "user" parameter it expects.
        var transientUser = new AppUser { UserName = email, Email = email };
        foreach (var validator in _userManager.PasswordValidators)
        {
            var validation = await validator.ValidateAsync(_userManager, transientUser, request.Password);
            if (!validation.Succeeded)
                return BadRequest(new { errors = validation.Errors.Select(e => e.Description) });
        }

        var registrationId = Guid.NewGuid().ToString("N");
        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        _cache.Set(PendingRegistrationPrefix + registrationId, new PendingRegistration(email, request.DisplayName, request.Password, code), PendingRegistrationLifetime);

        await SendCodeAsync(email, code, "Confirm your WorkPulse email address", "Enter this code to finish setting up your account.");
        return Ok(new RegisterResult { RegistrationId = registrationId, Email = email });
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

        // No EmailConfirmed check needed here — every AspNetUsers row is confirmed by
        // construction now (see ConfirmRegistration), so this can never be false.

        if (await _userManager.GetTwoFactorEnabledAsync(user))
        {
            await SendTwoFactorCodeAsync(user);
            return Ok(new LoginResult { RequiresTwoFactor = true, Email = user.Email! });
        }

        return Ok(new LoginResult { Auth = await IssueTokensAsync(user) });
    }

    [HttpPost("google")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResult>> GoogleSignIn(GoogleSignInRequest request)
    {
        var clientId = _config["GoogleSignIn:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
            clientId = _config["Google:ClientId"];
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.Credential, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { error = "Invalid Google credential." });
        }

        if (!payload.EmailVerified)
            return Unauthorized(new { error = "Your Google email address isn't verified." });

        var user = await _userManager.FindByEmailAsync(payload.Email);
        if (user != null)
        {
            // A matching password-based account is a different sign-in path from a different
            // person's perspective (this app doesn't auto-link on a verified email match) — the
            // owner needs to prove they know the password, not just that they control the inbox.
            if (await _userManager.HasPasswordAsync(user))
                return Conflict(new { error = "An account with this email already exists. Please log in with your password instead." });
        }
        else
        {
            // No password set — created (or previously signed in) via Google only, so this is a
            // pre-confirmed account exactly like ConfirmRegistration's, minus the password hash.
            user = new AppUser
            {
                UserName = payload.Email,
                Email = payload.Email,
                DisplayName = string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                EmailConfirmed = true
            };
            var result = await _userManager.CreateAsync(user);
            if (!result.Succeeded)
                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        }

        if (await _userManager.IsLockedOutAsync(user))
            return Unauthorized(new { error = "This account has been disabled." });

        if (await _userManager.GetTwoFactorEnabledAsync(user))
        {
            await SendTwoFactorCodeAsync(user);
            return Ok(new LoginResult { RequiresTwoFactor = true, Email = user.Email! });
        }

        return Ok(new LoginResult { Auth = await IssueTokensAsync(user) });
    }

    [HttpPost("confirm-email")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> ConfirmRegistration(ConfirmRegistrationRequest request)
    {
        var cacheKey = PendingRegistrationPrefix + request.RegistrationId;
        if (!_cache.TryGetValue(cacheKey, out PendingRegistration? pending) || pending == null || pending.Code != request.Code)
            return Unauthorized(new { error = "Invalid or expired code." });

        // The account is only ever created here, already confirmed — an abandoned or failed
        // attempt before this point leaves no trace in AspNetUsers at all.
        var user = new AppUser
        {
            UserName = pending.Email,
            Email = pending.Email,
            DisplayName = pending.DisplayName,
            EmailConfirmed = true
        };
        var result = await _userManager.CreateAsync(user, pending.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        _cache.Remove(cacheKey);
        return Ok(await IssueTokensAsync(user));
    }

    [HttpPost("resend-confirmation-code")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult> ResendConfirmationCode([FromBody] ResendConfirmationRequest request)
    {
        var cacheKey = PendingRegistrationPrefix + request.RegistrationId;
        if (_cache.TryGetValue(cacheKey, out PendingRegistration? pending) && pending != null)
        {
            var refreshed = pending with { Code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString() };
            _cache.Set(cacheKey, refreshed, PendingRegistrationLifetime);
            await SendCodeAsync(refreshed.Email, refreshed.Code, "Confirm your WorkPulse email address", "Enter this code to finish setting up your account.");
        }
        // Same response whether or not the registration id is still valid, so this can't be used
        // to probe for anything.
        return Ok();
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

    // Both code-send helpers below are best-effort: a broken/misconfigured email provider (e.g.
    // Resend's sandbox rejecting a recipient outside the verified domain) must never crash
    // Register/Login with a raw 500 and leave the user stuck. Instead the caller still proceeds
    // to the code-entry step, where "Resend code" can succeed later once the provider issue is
    // fixed — same reasoning as the Drive-mirror uploads elsewhere in this app.
    private async Task SendTwoFactorCodeAsync(AppUser user)
    {
        try
        {
            var code = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);
            await _emailSender.SendAsync(
                user.Email!,
                "Your WorkPulse verification code",
                $"Your verification code is: {code}\n\nThis code expires in a few minutes. If you didn't request this, you can ignore this email."
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send 2FA code to {Email}", user.Email);
        }
    }

    // Used by the pending-registration flow above — unlike 2FA, there's no persisted AppUser yet
    // to hang an Identity token provider off of, so the code itself is just a random 6 digits
    // generated at Register/ResendConfirmationCode time and compared directly.
    private async Task SendCodeAsync(string email, string code, string subject, string instructions)
    {
        try
        {
            await _emailSender.SendAsync(email, subject, $"Your confirmation code is: {code}\n\n{instructions} This code expires in 15 minutes.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send confirmation code to {Email}", email);
        }
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

public class GoogleSignInRequest
{
    public string Credential { get; set; } = "";
}

public class LoginResult
{
    public bool RequiresTwoFactor { get; set; }
    public string? Email { get; set; }
    public AuthResponse? Auth { get; set; }
}

public class RegisterResult
{
    public string RegistrationId { get; set; } = "";
    public string Email { get; set; } = "";
}

public class ConfirmRegistrationRequest
{
    public string RegistrationId { get; set; } = "";
    public string Code { get; set; } = "";
}

public class ResendConfirmationRequest
{
    public string RegistrationId { get; set; } = "";
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
