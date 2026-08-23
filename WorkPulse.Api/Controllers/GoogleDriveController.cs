using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Services;

namespace WorkPulse.Api.Controllers;

/// <summary>
/// Not ApiControllerBase: the /callback action is hit by the browser navigating directly from
/// Google's consent screen, with no Bearer token to authenticate — so [Authorize] is applied
/// per-action here instead of at the class level.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GoogleDriveController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;
    private readonly IConfiguration _config;
    private readonly IDataProtector _protector;

    public GoogleDriveController(AppDbContext db, GoogleDriveService drive, IConfiguration config, IDataProtectionProvider dp)
    {
        _db = db;
        _drive = drive;
        _config = config;
        // Purpose string scopes this protector so its output can never be mixed up with any
        // other Protect/Unprotect usage elsewhere in the app, even if one gets added later.
        _protector = dp.CreateProtector("GoogleDriveOAuthState");
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private string FrontendBaseUrl => _config["FrontendBaseUrl"] ?? "http://localhost:3000";

    [HttpGet("status")]
    [Authorize]
    public async Task<ActionResult<GoogleDriveStatusDto>> Status()
    {
        var conn = await _db.GoogleDriveConnections.FirstOrDefaultAsync(c => c.UserId == UserId);
        return Ok(new GoogleDriveStatusDto
        {
            Configured = _drive.IsConfigured,
            Connected = conn != null,
            ConnectedUtc = conn?.ConnectedUtc
        });
    }

    [HttpGet("connect")]
    [Authorize]
    public ActionResult<GoogleDriveConnectUrlDto> Connect()
    {
        if (!_drive.IsConfigured)
            return BadRequest(new { error = "Google Drive isn't configured on this server yet." });

        // The state param round-trips through Google unmodified, so it doubles as a signed,
        // tamper-proof way to know which user a callback with no Bearer token belongs to.
        var state = _protector.Protect(UserId);
        return Ok(new GoogleDriveConnectUrlDto { Url = _drive.GetAuthorizationUrl(state) });
    }

    [HttpGet("callback")]
    public async Task<ActionResult> Callback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
    {
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect($"{FrontendBaseUrl}/settings?drive=error");

        string userId;
        try
        {
            userId = _protector.Unprotect(state);
        }
        catch
        {
            return Redirect($"{FrontendBaseUrl}/settings?drive=error");
        }

        try
        {
            var (accessToken, refreshToken, expiresIn) = await _drive.ExchangeCodeAsync(code);
            if (string.IsNullOrEmpty(refreshToken))
            {
                // Google only omits this if the user already granted consent previously without
                // `prompt=consent` taking effect (e.g. a stale authorization) — surfacing it as an
                // error is clearer than silently storing a connection that can never refresh.
                return Redirect($"{FrontendBaseUrl}/settings?drive=error");
            }

            var conn = await _db.GoogleDriveConnections.FirstOrDefaultAsync(c => c.UserId == userId);
            if (conn == null)
            {
                conn = new GoogleDriveConnectionEntity { UserId = userId };
                _db.GoogleDriveConnections.Add(conn);
            }
            conn.RefreshToken = refreshToken;
            conn.AccessToken = accessToken;
            conn.AccessTokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
            conn.ConnectedUtc = DateTime.UtcNow;
            conn.DriveFolderId = null; // re-resolve on next upload in case it was manually deleted
            await _db.SaveChangesAsync();

            return Redirect($"{FrontendBaseUrl}/settings?drive=connected");
        }
        catch
        {
            return Redirect($"{FrontendBaseUrl}/settings?drive=error");
        }
    }

    [HttpPost("disconnect")]
    [Authorize]
    public async Task<ActionResult> Disconnect()
    {
        var conn = await _db.GoogleDriveConnections.FirstOrDefaultAsync(c => c.UserId == UserId);
        if (conn != null)
        {
            _db.GoogleDriveConnections.Remove(conn);
            await _db.SaveChangesAsync();
        }
        return Ok();
    }
}

public class GoogleDriveStatusDto
{
    public bool Configured { get; set; }
    public bool Connected { get; set; }
    public DateTime? ConnectedUtc { get; set; }
}

public class GoogleDriveConnectUrlDto
{
    public string Url { get; set; } = "";
}
