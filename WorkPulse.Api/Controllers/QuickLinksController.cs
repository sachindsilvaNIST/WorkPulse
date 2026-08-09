using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class QuickLinksController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public QuickLinksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<QuickLink>>> GetAll()
    {
        var links = await _db.QuickLinks
            .Where(l => l.UserId == UserId)
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
            .ToListAsync();

        return Ok(links.Select(l => l.ToQuickLink()).ToList());
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
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);
        if (entity == null) return NotFound();

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
