using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class TripReportsController : ApiControllerBase
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private readonly AppDbContext _db;

    public TripReportsController(AppDbContext db) => _db = db;

    // ===== TRIP REPORTS =====

    [HttpGet]
    public async Task<ActionResult<List<TripReport>>> GetAll()
    {
        var reports = await _db.TripReports
            .Where(t => t.UserId == UserId)
            .OrderByDescending(t => t.StartDate)
            .ToListAsync();

        return Ok(reports.Select(t => t.ToTripReport()).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TripReport>> Get(string id)
    {
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (entity == null) return NotFound();
        return Ok(entity.ToTripReport());
    }

    [HttpPost]
    public async Task<ActionResult<TripReport>> Create([FromBody] TripReport record)
    {
        var entity = record.ToEntity(UserId);
        _db.TripReports.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToTripReport());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TripReport>> Update(string id, [FromBody] TripReport record)
    {
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (entity == null) return NotFound();

        entity.Category = record.Category.ToString();
        entity.Destination = record.Destination;
        entity.StartDate = record.StartDate;
        entity.EndDate = record.EndDate;
        entity.Purpose = record.Purpose;
        entity.Notes = record.Notes;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToTripReport());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (entity == null) return NotFound();

        _db.TripReports.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== DOCUMENTS =====

    [HttpGet("{tripId}/documents")]
    public async Task<ActionResult<List<TripDocumentMeta>>> GetDocuments(string tripId, [FromQuery] string? search, [FromQuery] string? category)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == tripId && t.UserId == UserId);
        if (trip == null) return NotFound();

        var query = _db.TripDocuments.Where(d => d.TripReportId == tripId && d.UserId == UserId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(d => d.FileName.ToLower().Contains(q) || d.Label.ToLower().Contains(q));
        }

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(d => d.Category == category);

        var docs = await query.OrderByDescending(d => d.UploadedUtc).ToListAsync();
        return Ok(docs.Select(d => d.ToMeta()).ToList());
    }

    [HttpPost("{tripId}/documents")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<TripDocumentMeta>> UploadDocument(string tripId, IFormFile file, [FromForm] string category, [FromForm] string? label)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == tripId && t.UserId == UserId);
        if (trip == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = "File exceeds the 10 MB limit" });

        if (!Enum.TryParse<DocCategory>(category, out var parsedCategory))
            parsedCategory = DocCategory.Other;

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);

        var entity = new TripDocumentEntity
        {
            TripReportId = tripId,
            UserId = UserId,
            Category = parsedCategory.ToString(),
            Label = label ?? "",
            FileName = file.FileName,
            ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            Content = stream.ToArray(),
            UploadedUtc = DateTime.UtcNow
        };

        _db.TripDocuments.Add(entity);
        await _db.SaveChangesAsync();

        return Ok(entity.ToMeta());
    }

    [HttpGet("{tripId}/documents/{docId}")]
    public async Task<ActionResult> DownloadDocument(string tripId, string docId)
    {
        var doc = await _db.TripDocuments
            .FirstOrDefaultAsync(d => d.Id == docId && d.TripReportId == tripId && d.UserId == UserId);
        if (doc == null) return NotFound();

        return File(doc.Content, doc.ContentType, doc.FileName);
    }

    [HttpDelete("{tripId}/documents/{docId}")]
    public async Task<ActionResult> DeleteDocument(string tripId, string docId)
    {
        var doc = await _db.TripDocuments
            .FirstOrDefaultAsync(d => d.Id == docId && d.TripReportId == tripId && d.UserId == UserId);
        if (doc == null) return NotFound();

        _db.TripDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
