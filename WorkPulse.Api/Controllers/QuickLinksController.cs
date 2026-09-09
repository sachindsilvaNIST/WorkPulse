using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class QuickLinksController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly ShareAccessService _shareAccess;

    public QuickLinksController(AppDbContext db, ShareAccessService shareAccess)
    {
        _db = db;
        _shareAccess = shareAccess;
    }

    private async Task<bool> HasSharedAccessAsync(string resourceId, bool requireEdit = false)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        var permission = await _shareAccess.GetEffectivePermissionAsync("QuickLink", resourceId, email);
        if (permission == null) return false;
        return !requireEdit || permission == "Edit";
    }

    [HttpGet]
    public async Task<ActionResult<List<QuickLink>>> GetAll()
    {
        var links = await _db.QuickLinks
            .Where(l => l.UserId == UserId)
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
            .ToListAsync();

        return Ok(links.Select(l => l.ToQuickLink()).ToList());
    }

    /// <summary>New — Bookmarks previously had no single-item GET at all. Added specifically so a
    /// shared Bookmark has something to fetch; applies the exact same ownership-or-share check as
    /// everywhere else from the start, not a bare lookup.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<QuickLink>> Get(string id)
    {
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync(id)) return NotFound();
        return Ok(entity.ToQuickLink());
    }

    [HttpPost]
    public async Task<ActionResult<QuickLink>> Create([FromBody] QuickLink record)
    {
        var entity = record.ToEntity(UserId);
        _db.QuickLinks.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToQuickLink());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<QuickLink>> Update(string id, [FromBody] QuickLink record)
    {
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync(id, requireEdit: true)) return NotFound();

        entity.Label = record.Label;
        entity.Url = record.Url;
        entity.Category = record.Category;
        entity.Keywords = record.Keywords;
        entity.SortOrder = record.SortOrder;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToQuickLink());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);
        if (entity == null) return NotFound();

        _db.QuickLinks.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
