using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Services;

namespace WorkPulse.Api.Controllers;

/// <summary>The app's first unauthenticated data-serving endpoint — deliberately does NOT inherit
/// ApiControllerBase (which forces [Authorize]). Access is entirely gated by possessing the
/// random PublicToken; nothing here ever trusts a resource id on its own, only the token, and the
/// token is looked up directly rather than via any id a caller could supply or guess.</summary>
[ApiController]
[AllowAnonymous]
[Route("api/public-shares")]
public class PublicSharesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ShareAccessService _shareAccess;

    public PublicSharesController(AppDbContext db, ShareAccessService shareAccess)
    {
        _db = db;
        _shareAccess = shareAccess;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult> Get(string token)
    {
        var share = await _db.Shares.FirstOrDefaultAsync(s => s.IsPublic && s.PublicToken == token);
        if (share == null) return NotFound();

        var data = await _shareAccess.ResolveDataAsync(share.ResourceType, share.ResourceId);
        if (data == null) return NotFound();

        return Ok(new { share.ResourceType, permission = share.PublicPermission, data });
    }

    [HttpPut("{token}")]
    public async Task<ActionResult> Update(string token, [FromBody] Dictionary<string, object?> fields)
    {
        var share = await _db.Shares.FirstOrDefaultAsync(s => s.IsPublic && s.PublicToken == token);
        if (share == null) return NotFound();
        if (share.PublicPermission != "Edit") return Forbid();

        var updated = share.ResourceType switch
        {
            "DailyReport" => await UpdateDailyReportAsync(share.ResourceId, fields),
            "WeeklyReport" => await UpdateWeeklyReportAsync(share.ResourceId, fields),
            "Contact" => await UpdateContactAsync(share.ResourceId, fields),
            "QuickLink" => await UpdateQuickLinkAsync(share.ResourceId, fields),
            "Resource" => await UpdateResourceAsync(share.ResourceId, fields),
            // TripReport/TripDocument edits stay owner-managed for now — their fields (status,
            // amounts, linked resources) are entangled with the owning trip in ways the other five
            // simple field-updates aren't; public-Edit on those two is a deliberate v1 scope cut.
            _ => false,
        };

        if (!updated) return NotFound();
        await _db.SaveChangesAsync();

        var data = await _shareAccess.ResolveDataAsync(share.ResourceType, share.ResourceId);
        return Ok(new { share.ResourceType, permission = share.PublicPermission, data });
    }

    private static string? Str(Dictionary<string, object?> fields, string key) =>
        fields.TryGetValue(key, out var v) ? v?.ToString() : null;

    private async Task<bool> UpdateDailyReportAsync(string id, Dictionary<string, object?> fields)
    {
        var e = await _db.DailyReports.FindAsync(id);
        if (e == null) return false;
        if (Str(fields, "title") is { } title) e.Title = title;
        if (Str(fields, "body") is { } body) e.Body = body;
        e.LastModifiedUtc = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> UpdateWeeklyReportAsync(string id, Dictionary<string, object?> fields)
    {
        var e = await _db.WeeklyReports.FindAsync(id);
        if (e == null) return false;
        if (Str(fields, "title") is { } title) e.Title = title;
        if (Str(fields, "body") is { } body) e.Body = body;
        e.LastModifiedUtc = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> UpdateContactAsync(string id, Dictionary<string, object?> fields)
    {
        var e = await _db.Contacts.FindAsync(id);
        if (e == null) return false;
        if (Str(fields, "familyName") is { } fn) e.FamilyName = fn;
        if (Str(fields, "givenName") is { } gn) e.GivenName = gn;
        if (Str(fields, "department") is { } dept) e.Department = dept;
        if (Str(fields, "email") is { } email) e.Email = email;
        if (Str(fields, "contactNumber") is { } cn) e.ContactNumber = cn;
        if (Str(fields, "notes") is { } notes) e.Notes = notes;
        e.LastModifiedUtc = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> UpdateQuickLinkAsync(string id, Dictionary<string, object?> fields)
    {
        var e = await _db.QuickLinks.FindAsync(id);
        if (e == null) return false;
        if (Str(fields, "label") is { } label) e.Label = label;
        if (Str(fields, "url") is { } url) e.Url = url;
        if (Str(fields, "category") is { } category) e.Category = category;
        e.LastModifiedUtc = DateTime.UtcNow;
        return true;
    }

    private async Task<bool> UpdateResourceAsync(string id, Dictionary<string, object?> fields)
    {
        var e = await _db.Resources.FindAsync(id);
        if (e == null) return false;
        if (Str(fields, "title") is { } title) e.Title = title;
        if (Str(fields, "notes") is { } notes) e.Notes = notes;
        e.LastModifiedUtc = DateTime.UtcNow;
        return true;
    }
}
