using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

/// <summary>
/// Cross-trip document library ("Reimbursement" tab) — searches every document across
/// every business trip for the current user in one place, each result carrying enough
/// of its parent trip's context to link back to it. Also owns the user's reusable
/// category list (categories are DB-backed, not a fixed enum).
/// </summary>
[Route("api/[controller]")]
public class ReimbursementController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public ReimbursementController(AppDbContext db) => _db = db;

    [HttpGet("documents")]
    public async Task<ActionResult<List<TripDocumentWithTrip>>> GetAllDocuments([FromQuery] string? search, [FromQuery] string? category)
    {
        var query =
            from d in _db.TripDocuments
            join t in _db.TripReports on d.TripReportId equals t.Id
            where d.UserId == UserId && t.UserId == UserId
            select new { Doc = d, Trip = t };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(x =>
                x.Doc.FileName.ToLower().Contains(q) ||
                x.Doc.Label.ToLower().Contains(q) ||
                x.Trip.Destination.ToLower().Contains(q));
        }

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(x => x.Doc.Category == category);

        var results = await query
            .OrderByDescending(x => x.Doc.UploadedUtc)
            .ToListAsync();

        var mapped = results.Select(x => new TripDocumentWithTrip
        {
            Id = x.Doc.Id,
            TripReportId = x.Doc.TripReportId,
            Category = x.Doc.Category,
            Label = x.Doc.Label,
            FileName = x.Doc.FileName,
            ContentType = x.Doc.ContentType,
            SizeBytes = x.Doc.SizeBytes,
            UploadedUtc = x.Doc.UploadedUtc,
            DocumentDate = x.Doc.DocumentDate,
            DriveFileId = x.Doc.DriveFileId,
            DriveWebViewLink = x.Doc.DriveWebViewLink,
            TripDestination = x.Trip.Destination,
            TripCategory = Enum.TryParse<TripCategory>(x.Trip.Category, out var tc) ? tc : TripCategory.Domestic,
            TripStartDate = x.Trip.StartDate,
            TripEndDate = x.Trip.EndDate
        }).ToList();

        return Ok(mapped);
    }

    // ===== Categories =====

    [HttpGet("categories")]
    public async Task<ActionResult<List<ReimbursementCategory>>> GetCategories()
    {
        var categories = await _db.ReimbursementCategories
            .Where(c => c.UserId == UserId)
            .OrderBy(c => c.Name)
            .ToListAsync();
        return Ok(categories.Select(c => c.ToDto()).ToList());
    }

    [HttpPost("categories")]
    public async Task<ActionResult<ReimbursementCategory>> CreateCategory([FromBody] CreateCategoryRequest request)
    {
        var name = (request.Name ?? "").Trim();
        if (name.Length == 0) return BadRequest(new { error = "Category name is required" });

        var existing = await _db.ReimbursementCategories
            .FirstOrDefaultAsync(c => c.UserId == UserId && c.Name.ToLower() == name.ToLower());
        if (existing != null) return Ok(existing.ToDto());

        var entity = new ReimbursementCategoryEntity { UserId = UserId, Name = name };
        _db.ReimbursementCategories.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToDto());
    }

    [HttpPut("categories/{id}")]
    public async Task<ActionResult<ReimbursementCategory>> RenameCategory(int id, [FromBody] CreateCategoryRequest request)
    {
        var entity = await _db.ReimbursementCategories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (entity == null) return NotFound();

        var name = (request.Name ?? "").Trim();
        if (name.Length == 0) return BadRequest(new { error = "Category name is required" });

        var clash = await _db.ReimbursementCategories
            .AnyAsync(c => c.UserId == UserId && c.Id != id && c.Name.ToLower() == name.ToLower());
        if (clash) return BadRequest(new { error = "A category with that name already exists." });

        var oldName = entity.Name;
        entity.Name = name;

        // Keep every document already tagged with the old name in sync with the rename — Category
        // is a free string (not a strict FK) precisely so this kind of bulk update is safe and
        // simple, but it still has to happen explicitly rather than relying on a foreign key.
        if (!string.Equals(oldName, name, StringComparison.OrdinalIgnoreCase))
        {
            var docs = await _db.TripDocuments.Where(d => d.UserId == UserId && d.Category == oldName).ToListAsync();
            foreach (var doc in docs) doc.Category = name;
        }

        await _db.SaveChangesAsync();
        return Ok(entity.ToDto());
    }

    [HttpDelete("categories/{id}")]
    public async Task<ActionResult> DeleteCategory(int id)
    {
        var entity = await _db.ReimbursementCategories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (entity == null) return NotFound();

        _db.ReimbursementCategories.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateCategoryRequest
{
    public string Name { get; set; } = "";
}
