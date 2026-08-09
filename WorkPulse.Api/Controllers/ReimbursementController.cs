using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

/// <summary>
/// Cross-trip document library ("Reimbursement" tab) — searches every document across
/// every business trip for the current user in one place, each result carrying enough
/// of its parent trip's context to link back to it.
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
            Category = Enum.TryParse<DocCategory>(x.Doc.Category, out var dc) ? dc : DocCategory.Other,
            Label = x.Doc.Label,
            FileName = x.Doc.FileName,
            ContentType = x.Doc.ContentType,
            SizeBytes = x.Doc.SizeBytes,
            UploadedUtc = x.Doc.UploadedUtc,
            TripDestination = x.Trip.Destination,
            TripCategory = Enum.TryParse<TripCategory>(x.Trip.Category, out var tc) ? tc : TripCategory.Domestic,
            TripStartDate = x.Trip.StartDate,
            TripEndDate = x.Trip.EndDate
        }).ToList();

        return Ok(mapped);
    }
}
