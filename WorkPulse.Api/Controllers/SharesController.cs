using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;

namespace WorkPulse.Api.Controllers;

/// <summary>Owner-side share management — creating/editing/revoking a share, and listing what's
/// been shared with the current account. The actual cross-account read/write access this grants
/// is enforced per entity type in each of those controllers via ShareAccessService, not here.</summary>
[Route("api/[controller]")]
public class SharesController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly ShareAccessService _shareAccess;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<SharesController> _logger;

    public SharesController(AppDbContext db, ShareAccessService shareAccess, IEmailSender emailSender, IConfiguration config, ILogger<SharesController> logger)
    {
        _db = db;
        _shareAccess = shareAccess;
        _emailSender = emailSender;
        _config = config;
        _logger = logger;
    }

    private static readonly string[] ResourceTypes =
        { "TripReport", "TripDocument", "DailyReport", "WeeklyReport", "Contact", "QuickLink", "Resource" };

    private async Task<bool> OwnsResourceAsync(string resourceType, string resourceId) => resourceType switch
    {
        "TripReport" => await _db.TripReports.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "TripDocument" => await _db.TripDocuments.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "DailyReport" => await _db.DailyReports.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "WeeklyReport" => await _db.WeeklyReports.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "Contact" => await _db.Contacts.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "QuickLink" => await _db.QuickLinks.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        "Resource" => await _db.Resources.AnyAsync(x => x.Id == resourceId && x.UserId == UserId),
        _ => false,
    };

    /// <summary>The shared item's own display title — the one place a per-type switch is
    /// unavoidable, kept small and explicit rather than abstracted away.</summary>
    private async Task<string?> ResolveTitleAsync(string resourceType, string resourceId) => resourceType switch
    {
        "TripReport" => (await _db.TripReports.FindAsync(resourceId))?.Destination,
        "TripDocument" => (await _db.TripDocuments.FindAsync(resourceId)) is { } d ? (string.IsNullOrWhiteSpace(d.Label) ? d.FileName : d.Label) : null,
        "DailyReport" => (await _db.DailyReports.FindAsync(resourceId))?.Title,
        "WeeklyReport" => (await _db.WeeklyReports.FindAsync(resourceId))?.Title,
        "Contact" => (await _db.Contacts.FindAsync(resourceId)) is { } c ? $"{c.FamilyName} {c.GivenName}".Trim() : null,
        "QuickLink" => (await _db.QuickLinks.FindAsync(resourceId))?.Label,
        "Resource" => (await _db.Resources.FindAsync(resourceId))?.Title,
        _ => null,
    };

    [HttpGet]
    public async Task<ActionResult<ShareDto>> Get([FromQuery] string resourceType, [FromQuery] string resourceId)
    {
        if (!ResourceTypes.Contains(resourceType)) return BadRequest(new { error = "Unknown resource type." });
        if (!await OwnsResourceAsync(resourceType, resourceId)) return NotFound();

        var share = await _db.Shares.Include(s => s.Grants)
            .FirstOrDefaultAsync(s => s.ResourceType == resourceType && s.ResourceId == resourceId && s.OwnerUserId == UserId);

        if (share == null)
            return Ok(new ShareDto { ResourceType = resourceType, ResourceId = resourceId, IsPublic = false, PublicPermission = "Read", Grants = new() });

        return Ok(ToDto(share));
    }

    [HttpPut]
    public async Task<ActionResult<ShareDto>> Save([FromBody] ShareDto request)
    {
        if (!ResourceTypes.Contains(request.ResourceType)) return BadRequest(new { error = "Unknown resource type." });
        if (!await OwnsResourceAsync(request.ResourceType, request.ResourceId)) return NotFound();

        var share = await _db.Shares.Include(s => s.Grants)
            .FirstOrDefaultAsync(s => s.ResourceType == request.ResourceType && s.ResourceId == request.ResourceId && s.OwnerUserId == UserId);

        if (share == null)
        {
            share = new ShareEntity { ResourceType = request.ResourceType, ResourceId = request.ResourceId, OwnerUserId = UserId };
            _db.Shares.Add(share);
        }

        share.IsPublic = request.IsPublic;
        share.PublicPermission = request.PublicPermission is "Read" or "Edit" ? request.PublicPermission : "Read";
        // A fresh random token is only ever minted here, and only while public — flipping back to
        // private (or being revoked outright below) always drops it, so a link can never come
        // back to life just by re-enabling IsPublic later with the old token somehow retained.
        share.PublicToken = request.IsPublic ? share.PublicToken ?? GenerateToken() : null;

        // Captured before the grant list is replaced, so re-saving an already-shared item (e.g.
        // just flipping the public toggle) never re-notifies someone who was already on it —
        // only genuinely new emails trigger a fresh email.
        var previousEmails = share.Grants.Select(g => g.Email.ToLowerInvariant()).ToHashSet();

        _db.ShareGrants.RemoveRange(share.Grants);
        share.Grants = request.Grants
            .Where(g => !string.IsNullOrWhiteSpace(g.Email))
            .Select(g => new ShareGrantEntity
            {
                ShareId = share.Id,
                Email = g.Email.Trim(),
                Permission = g.Permission is "Read" or "Edit" ? g.Permission : "Read",
            })
            .ToList();

        var newlyGrantedEmails = share.Grants
            .Where(g => !previousEmails.Contains(g.Email.ToLowerInvariant()))
            .Select(g => new { g.Email, g.Permission })
            .ToList();

        await _db.SaveChangesAsync();

        if (request.Notify && newlyGrantedEmails.Count > 0)
        {
            var itemTitle = await ResolveTitleAsync(request.ResourceType, request.ResourceId) ?? "an item";
            var claimedName = User.FindFirstValue(ClaimTypes.Name);
            var sharerName = string.IsNullOrWhiteSpace(claimedName) ? "Someone" : claimedName;
            foreach (var grant in newlyGrantedEmails)
                await SendShareNotificationAsync(grant.Email, sharerName, itemTitle, grant.Permission);
        }

        return Ok(ToDto(share));
    }

    /// <summary>Best-effort, same pattern as every other notification email in this app
    /// (AuthController's confirmation/2FA codes) — a broken/misconfigured email provider must
    /// never fail the share itself, since the share already succeeded in the database.</summary>
    private async Task SendShareNotificationAsync(string toEmail, string sharerName, string itemTitle, string permission)
    {
        try
        {
            var appUrl = _config["FrontendBaseUrl"] ?? "https://work-pulse-ruddy.vercel.app";
            var body =
                $"{sharerName} shared \"{itemTitle}\" with you on WorkPulse.\n\n" +
                $"You have {(permission == "Edit" ? "edit" : "view")} access.\n\n" +
                $"Sign in (or create a free account) with this email address to view it: {appUrl}/shared\n\n" +
                "If you weren't expecting this, you can safely ignore this email.";
            await _emailSender.SendAsync(toEmail, $"{sharerName} shared \"{itemTitle}\" with you", body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send share notification to {Email}", toEmail);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Revoke(string id)
    {
        var share = await _db.Shares.FirstOrDefaultAsync(s => s.Id == id && s.OwnerUserId == UserId);
        if (share == null) return NotFound();

        _db.Shares.Remove(share);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("shared-with-me")]
    public async Task<ActionResult<List<SharedWithMeItem>>> SharedWithMe()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email)) return Ok(new List<SharedWithMeItem>());

        var grants = await _db.ShareGrants
            .Where(g => g.Email.ToLower() == email.ToLower())
            .Join(_db.Shares, g => g.ShareId, s => s.Id, (g, s) => new { g.Permission, s.Id, s.ResourceType, s.ResourceId, s.OwnerUserId })
            .ToListAsync();

        var ownerNames = await _db.Users
            .Where(u => grants.Select(g => g.OwnerUserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);

        var result = new List<SharedWithMeItem>();
        foreach (var g in grants)
        {
            var title = await ResolveTitleAsync(g.ResourceType, g.ResourceId);
            if (title == null) continue; // underlying item was deleted; grant is orphaned, just skip it
            result.Add(new SharedWithMeItem
            {
                ShareId = g.Id,
                ResourceType = g.ResourceType,
                ResourceId = g.ResourceId,
                Title = title,
                OwnerDisplayName = ownerNames.TryGetValue(g.OwnerUserId, out var ownerName) && !string.IsNullOrWhiteSpace(ownerName) ? ownerName : "Someone",
                Permission = g.Permission,
            });
        }
        return Ok(result);
    }

    /// <summary>The generic viewer behind /shared/[shareId] on the frontend — owner-agnostic:
    /// works whether the caller owns the item (full Edit, they're just previewing their own
    /// share) or is one of its grantees, but 404s for anyone else exactly like every other
    /// per-entity endpoint does for a non-owner/non-grantee.</summary>
    [HttpGet("{id}/data")]
    public async Task<ActionResult> GetSharedData(string id)
    {
        var share = await _db.Shares.FirstOrDefaultAsync(s => s.Id == id);
        if (share == null) return NotFound();

        string? permission = share.OwnerUserId == UserId ? "Edit" : null;
        if (permission == null)
        {
            var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
            permission = await _shareAccess.GetEffectivePermissionAsync(share.ResourceType, share.ResourceId, email);
        }
        if (permission == null) return NotFound();

        var data = await _shareAccess.ResolveDataAsync(share.ResourceType, share.ResourceId);
        if (data == null) return NotFound();

        return Ok(new { share.ResourceType, permission, data });
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        return Convert.ToBase64String(bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static ShareDto ToDto(ShareEntity share) => new()
    {
        Id = share.Id,
        ResourceType = share.ResourceType,
        ResourceId = share.ResourceId,
        IsPublic = share.IsPublic,
        PublicPermission = share.PublicPermission,
        PublicToken = share.PublicToken,
        Grants = share.Grants.Select(g => new ShareGrantDto { Email = g.Email, Permission = g.Permission }).ToList(),
    };
}

public class ShareDto
{
    public string? Id { get; set; }
    public string ResourceType { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public bool IsPublic { get; set; }
    public string PublicPermission { get; set; } = "Read";
    public string? PublicToken { get; set; }
    public List<ShareGrantDto> Grants { get; set; } = new();
    /// <summary>Request-only — whether to email newly-added people. Always true on a response
    /// (irrelevant there, but keeps the DTO one shape instead of splitting request/response).</summary>
    public bool Notify { get; set; } = true;
}

public class ShareGrantDto
{
    public string Email { get; set; } = "";
    public string Permission { get; set; } = "Read";
}

public class SharedWithMeItem
{
    public string ShareId { get; set; } = "";
    public string ResourceType { get; set; } = "";
    public string ResourceId { get; set; } = "";
    public string Title { get; set; } = "";
    public string OwnerDisplayName { get; set; } = "";
    public string Permission { get; set; } = "Read";
}
