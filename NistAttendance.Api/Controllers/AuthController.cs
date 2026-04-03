using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using NistAttendance.Api.Data.Entities;
using NistAttendance.DTOs;

namespace NistAttendance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IConfiguration _config;

    public AuthController(UserManager<AppUser> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    [HttpPost("register")]
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

        return Ok(await GenerateAuthResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { error = "Invalid email or password" });

        var response = await GenerateAuthResponse(user);

        user.RefreshToken = response.RefreshToken;
        user.RefreshTokenExpiryUtc = DateTime.UtcNow.AddDays(30);
        await _userManager.UpdateAsync(user);

        return Ok(response);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshTokenRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.Token);
        if (principal == null)
            return Unauthorized(new { error = "Invalid token" });

        var email = principal.FindFirstValue(ClaimTypes.Email);
        if (email == null)
            return Unauthorized(new { error = "Invalid token" });

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.RefreshToken != request.RefreshToken
            || user.RefreshTokenExpiryUtc <= DateTime.UtcNow)
            return Unauthorized(new { error = "Invalid or expired refresh token" });

        var response = await GenerateAuthResponse(user);

        user.RefreshToken = response.RefreshToken;
        user.RefreshTokenExpiryUtc = DateTime.UtcNow.AddDays(30);
        await _userManager.UpdateAsync(user);

        return Ok(response);
    }

    private async Task<AuthResponse> GenerateAuthResponse(AppUser user)
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

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "NistAttendanceApi",
            audience: _config["Jwt:Audience"] ?? "NistAttendanceApp",
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        return new AuthResponse
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            RefreshToken = GenerateRefreshToken(),
            ExpiresAt = expires,
            DisplayName = user.DisplayName
        };
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
            ValidIssuer = _config["Jwt:Issuer"] ?? "NistAttendanceApi",
            ValidAudience = _config["Jwt:Audience"] ?? "NistAttendanceApp",
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
