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
/// per-action here instead of at the class level. Mirrors GoogleDriveController's shape exactly,
/// but this is a separate connection/table since Gmail access is a distinct, more sensitive scope
/// (and typically a different Google account than Drive).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GmailController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GmailService _gmail;
    private readonly IConfiguration _config;
    private readonly IDataProtector _protector;

    public GmailController(AppDbContext db, GmailService gmail, IConfiguration config, IDataProtectionProvider dp)
    {
        _db = db;
        _gmail = gmail;
        _config = config;
        _protector = dp.CreateProtector("GmailOAuthState");
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private string FrontendBaseUrl => _config["FrontendBaseUrl"] ?? "http://localhost:3000";

    [HttpGet("status")]
    [Authorize]
    public async Task<ActionResult<GmailStatusDto>> Status()
    {
        var conn = await _db.GmailConnections.FirstOrDefaultAsync(c => c.UserId == UserId);
        return Ok(new GmailStatusDto
        {
            Configured = _gmail.IsConfigured,
            Connected = conn != null,
            EmailAddress = conn?.EmailAddress,
            ConnectedUtc = conn?.ConnectedUtc
        });
    }

    [HttpGet("connect")]
    [Authorize]
    public ActionResult<GmailConnectUrlDto> Connect()
    {
        if (!_gmail.IsConfigured)
            return BadRequest(new { error = "Gmail isn't configured on this server yet." });

        var state = _protector.Protect(UserId);
        return Ok(new GmailConnectUrlDto { Url = _gmail.GetAuthorizationUrl(state) });
    }

    [HttpGet("callback")]
    public async Task<ActionResult> Callback([FromQuery] string? code, [FromQuery] string? state, [FromQuery] string? error)
    {
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return Redirect($"{FrontendBaseUrl}/settings?gmail=error");

        string userId;
        try
        {
            userId = _protector.Unprotect(state);
        }
        catch
        {
            return Redirect($"{FrontendBaseUrl}/settings?gmail=error");
        }

        try
        {
            var (accessToken, refreshToken, expiresIn) = await _gmail.ExchangeCodeAsync(code);
            if (string.IsNullOrEmpty(refreshToken))
                return Redirect($"{FrontendBaseUrl}/settings?gmail=error");

            var emailAddress = await _gmail.GetEmailAddressAsync(accessToken);

            var conn = await _db.GmailConnections.FirstOrDefaultAsync(c => c.UserId == userId);
            if (conn == null)
            {
                conn = new GmailConnectionEntity { UserId = userId };
                _db.GmailConnections.Add(conn);
            }
            conn.RefreshToken = refreshToken;
            conn.AccessToken = accessToken;
            conn.AccessTokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
            conn.EmailAddress = emailAddress;
            conn.ConnectedUtc = DateTime.UtcNow;
            conn.HistoryId = null; // re-established on next full sync (Stage 2+)
            conn.WatchExpiryUtc = null; // re-established when push sync is wired up (Stage 4)
            await _db.SaveChangesAsync();

            return Redirect($"{FrontendBaseUrl}/settings?gmail=connected");
        }
        catch
        {
            return Redirect($"{FrontendBaseUrl}/settings?gmail=error");
        }
    }

    [HttpPost("disconnect")]
    [Authorize]
    public async Task<ActionResult> Disconnect()
    {
        var conn = await _db.GmailConnections.FirstOrDefaultAsync(c => c.UserId == UserId);
        if (conn != null)
        {
            _db.GmailConnections.Remove(conn);
            await _db.SaveChangesAsync();
        }
        return Ok();
    }
}

public class GmailStatusDto
{
    public bool Configured { get; set; }
    public bool Connected { get; set; }
    public string? EmailAddress { get; set; }
    public DateTime? ConnectedUtc { get; set; }
}

public class GmailConnectUrlDto
{
    public string Url { get; set; } = "";
}
