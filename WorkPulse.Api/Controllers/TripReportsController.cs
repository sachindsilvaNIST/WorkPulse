using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver.GridFS;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class TripReportsController : ApiControllerBase
{
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB

    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;
    private readonly ShareAccessService _shareAccess;
    private readonly GridFSBucket _gridFs;
    private readonly ILogger<TripReportsController> _logger;

    public TripReportsController(AppDbContext db, GoogleDriveService drive, ShareAccessService shareAccess, GridFSBucket gridFs, ILogger<TripReportsController> logger)
    {
        _db = db;
        _drive = drive;
        _shareAccess = shareAccess;
        _gridFs = gridFs;
        _logger = logger;
    }

    /// <summary>Read-side share fallback for a single GET/{id}-style endpoint — call once
    /// ownership has already failed. Returns true (proceed) or false (caller should 404).</summary>
    private async Task<bool> HasSharedAccessAsync(string resourceType, string resourceId, bool requireEdit = false)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        var permission = await _shareAccess.GetEffectivePermissionAsync(resourceType, resourceId, email);
        if (permission == null) return false;
        return !requireEdit || permission == "Edit";
    }

    // ===== TRIP REPORTS =====

    [HttpGet]
    public async Task<ActionResult<List<TripReport>>> GetAll()
    {
        var reports = await _db.TripReports
            .Where(t => t.UserId == UserId)
            .ToListAsync();

        // One query for all trips' document counts rather than N+1 — Business Trips shows this
        // count on every card in the list, so it needs to come back with the list itself.
        // Materialized first, then grouped in-memory — the Mongo EF provider doesn't support
        // GroupBy/Select on an unmaterialized IQueryable.
        var allDocs = await _db.TripDocuments.Where(d => d.UserId == UserId).ToListAsync();
        var counts = allDocs.GroupBy(d => d.TripReportId).ToDictionary(g => g.Key, g => g.Count());

        var dtos = reports
            .OrderByDescending(t => t.StartDate)
            .Select(t =>
            {
                var dto = t.ToTripReport();
                dto.DocumentCount = counts.GetValueOrDefault(t.Id, 0);
                return dto;
            }).ToList();

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TripReport>> Get(string id)
    {
        // Segments/BudgetLines are embedded — load automatically with the parent, no .Include().
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync("TripReport", id)) return NotFound();
        return Ok(entity.ToTripReport());
    }

    // "{yyyyMM}{seq:D4}" per user per month, e.g. "2026090024" — mirrors the source system's trip
    // number format. Sequence is this user's count of trips already created this calendar month,
    // not a global counter, so it stays small and readable.
    private async Task<string> GenerateTripNumberAsync(DateOnly startDate)
    {
        var prefix = $"{startDate:yyyyMM}";
        var countThisMonth = await _db.TripReports.CountAsync(t =>
            t.UserId == UserId && t.TripNumber.StartsWith(prefix));
        return $"{prefix}{(countThisMonth + 1):D4}";
    }

    [HttpPost]
    public async Task<ActionResult<TripReport>> Create([FromBody] TripReport record)
    {
        var entity = record.ToEntity(UserId);
        entity.TripNumber = await GenerateTripNumberAsync(entity.StartDate);
        _db.TripReports.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToTripReport());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TripReport>> Update(string id, [FromBody] TripReport record)
    {
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync("TripReport", id, requireEdit: true)) return NotFound();

        entity.Category = record.Category.ToString();
        entity.Destination = record.Destination;
        entity.StartDate = record.StartDate;
        entity.EndDate = record.EndDate;
        entity.Purpose = record.Purpose;
        entity.Notes = record.Notes;
        entity.Status = record.Status.ToString();
        entity.DepartmentCode = record.DepartmentCode;
        // No Kind=Utc coercion needed here anymore — that was a Npgsql/"timestamp with time zone"
        // requirement; BSON's Date type has no such CLR-side Kind requirement.
        entity.ScheduledDeparture = record.ScheduledDeparture;
        entity.ScheduledReturn = record.ScheduledReturn;
        entity.TicketArrangementRequest = record.TicketArrangementRequest;
        entity.LastModifiedUtc = DateTime.UtcNow;

        // Wholesale replace, same convention as AttendanceController.SaveMonth's Records handling
        // — the client always submits the full current set of segments/budget lines. Clear()+Add()
        // rather than reassigning the List reference, so EF's change tracker picks up the
        // removals correctly for an embedded collection.
        entity.Segments.Clear();
        foreach (var s in record.Segments.Select(s => s.ToEntity()))
            entity.Segments.Add(s);
        entity.BudgetLines.Clear();
        foreach (var b in record.BudgetLines.Select(b => b.ToEntity()))
            entity.BudgetLines.Add(b);

        await _db.SaveChangesAsync();
        return Ok(entity.ToTripReport());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id && t.UserId == UserId);
        if (entity == null) return NotFound();

        // Once Approved or Settled, the trip is locked against casual deletion — matches the
        // source system's dedicated "delete an approved application" screen being a distinct,
        // more deliberate action than deleting an in-progress draft.
        if (entity.Status is nameof(TripStatus.Approved) or nameof(TripStatus.Settled))
            return Conflict(new { error = $"This trip is {entity.Status} and can't be deleted casually. Set it back to Draft or Submitted first if you really want to remove it." });

        // Documents are a separate top-level collection (GridFS-backed), not embedded — Mongo has
        // no cascade-delete, so clean them (and their GridFS blobs) up explicitly.
        var docs = await _db.TripDocuments.Where(d => d.TripReportId == id).ToListAsync();
        foreach (var doc in docs)
        {
            if (doc.ContentGridFsId != null)
            {
                try { await _gridFs.DeleteAsync(ObjectId.Parse(doc.ContentGridFsId)); }
                catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for document {DocId}", doc.Id); }
            }
        }
        _db.TripDocuments.RemoveRange(docs);

        _db.TripReports.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ===== SETTLEMENT =====
    // Settlement is a single embedded sub-document on TripReportEntity now — no separate
    // TripSettlements collection/query, just read/write trip.Settlement directly.

    [HttpGet("{id}/settlement")]
    public async Task<ActionResult<TripSettlement>> GetSettlement(string id)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id);
        if (trip == null) return NotFound();
        if (trip.UserId != UserId && !await HasSharedAccessAsync("TripReport", id)) return NotFound();

        // No settlement started yet — an empty one, not a 404, so the frontend can render the
        // form straight away rather than special-casing "doesn't exist yet".
        return Ok(trip.Settlement?.ToTripSettlement(id) ?? new TripSettlement { TripReportId = id });
    }

    [HttpPut("{id}/settlement")]
    public async Task<ActionResult<TripSettlement>> SaveSettlement(string id, [FromBody] TripSettlement record)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == id);
        if (trip == null) return NotFound();
        if (trip.UserId != UserId && !await HasSharedAccessAsync("TripReport", id, requireEdit: true)) return NotFound();

        var settlement = trip.Settlement;
        if (settlement != null)
        {
            settlement.EmployeeNo = record.EmployeeNo;
            settlement.BankAccountNumber = record.BankAccountNumber;
            settlement.Bank = record.Bank;
            settlement.Branch = record.Branch;
            settlement.LocationAtSettlement = record.LocationAtSettlement;
            settlement.Region = record.Region;
            settlement.AccountingCode = record.AccountingCode;
            settlement.SourceDocumentNo = record.SourceDocumentNo;
            settlement.LastModifiedUtc = DateTime.UtcNow;

            settlement.TransportationLines.Clear();
            foreach (var l in record.TransportationLines.Select(l => l.ToEntity()))
                settlement.TransportationLines.Add(l);
            settlement.OtherLines.Clear();
            foreach (var l in record.OtherLines.Select(l => l.ToEntity()))
                settlement.OtherLines.Add(l);
        }
        else
        {
            settlement = record.ToEntity();
            trip.Settlement = settlement;
        }

        await _db.SaveChangesAsync();
        return Ok(settlement.ToTripSettlement(id));
    }

    // ===== DOCUMENTS =====

    [HttpGet("{tripId}/documents")]
    public async Task<ActionResult<List<TripDocumentMeta>>> GetDocuments(string tripId, [FromQuery] string? search, [FromQuery] string? category)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == tripId && t.UserId == UserId);
        if (trip == null) return NotFound();

        // TripDocumentEntity no longer carries file bytes at all (they live in GridFS) — a plain
        // fetch-then-map is enough, no separate projection needed to keep bytes off the wire.
        var docs = await _db.TripDocuments.Where(d => d.TripReportId == tripId && d.UserId == UserId).ToListAsync();

        IEnumerable<TripDocumentEntity> filtered = docs;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            filtered = filtered.Where(d => d.FileName.ToLower().Contains(q) || d.Label.ToLower().Contains(q));
        }
        if (!string.IsNullOrWhiteSpace(category))
            filtered = filtered.Where(d => d.Category == category);

        return Ok(filtered.OrderByDescending(d => d.UploadedUtc).Select(d => d.ToMeta()).ToList());
    }

    [HttpPost("{tripId}/documents")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<TripDocumentMeta>> UploadDocument(
        string tripId,
        IFormFile file,
        [FromForm] string category,
        [FromForm] string? label,
        [FromForm] string? documentDate,
        [FromForm] decimal? amount,
        [FromForm] string? currency)
    {
        var trip = await _db.TripReports.FirstOrDefaultAsync(t => t.Id == tripId && t.UserId == UserId);
        if (trip == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = "File exceeds the 50 MB limit" });

        var categoryName = (category ?? "").Trim();
        if (categoryName.Length == 0)
            return BadRequest(new { error = "Category is required" });

        DateOnly? parsedDate = DateOnly.TryParse(documentDate, out var d) ? d : null;

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var bytes = stream.ToArray();

        var gridFsId = await _gridFs.UploadFromBytesAsync(file.FileName, bytes);

        var entity = new TripDocumentEntity
        {
            TripReportId = tripId,
            UserId = UserId,
            Category = categoryName,
            Label = label ?? "",
            FileName = file.FileName,
            ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            ContentGridFsId = gridFsId.ToString(),
            UploadedUtc = DateTime.UtcNow,
            DocumentDate = parsedDate,
            Amount = amount,
            Currency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency
        };

        // A category typed at upload time that doesn't exist yet becomes a real, reusable row —
        // matches "user can create new categories ... reused for other reimbursements" without
        // requiring a separate create-category round-trip before every first-time use.
        var categoryExists = await _db.ReimbursementCategories
            .AnyAsync(c => c.UserId == UserId && c.Name.ToLower() == categoryName.ToLower());
        if (!categoryExists)
            _db.ReimbursementCategories.Add(new ReimbursementCategoryEntity { UserId = UserId, Name = categoryName });

        _db.TripDocuments.Add(entity);
        await _db.SaveChangesAsync();

        // Local GridFS copy above is the guaranteed one (already saved) — Drive is a best-effort
        // mirror on top of that, so a Drive hiccup never blocks the upload itself.
        try
        {
            var mirrored = await _drive.TryUploadAsync(UserId, entity.FileName, entity.ContentType, bytes);
            if (mirrored != null)
            {
                entity.DriveFileId = mirrored.Value.FileId;
                entity.DriveWebViewLink = mirrored.Value.WebViewLink;
                await _db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Google Drive mirror upload failed for document {DocId}", entity.Id);
        }

        return Ok(entity.ToMeta());
    }

    [HttpGet("{tripId}/documents/{docId}")]
    public async Task<ActionResult> DownloadDocument(string tripId, string docId)
    {
        var doc = await _db.TripDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.TripReportId == tripId);
        if (doc == null) return NotFound();
        if (doc.UserId != UserId && !await HasSharedAccessAsync("TripDocument", docId)) return NotFound();
        if (doc.ContentGridFsId == null) return NotFound();

        var bytes = await _gridFs.DownloadAsBytesAsync(ObjectId.Parse(doc.ContentGridFsId));
        return File(bytes, doc.ContentType, doc.FileName);
    }

    // Partial update — used by both Business Trips (amount, resource link) and Reimbursement
    // (status, resource link; Reimbursement already has each document's TripReportId from
    // GetAllDocuments, so it calls this same trip-scoped endpoint rather than needing its own).
    public class UpdateDocumentRequest
    {
        public decimal? Amount { get; set; }
        public string? Currency { get; set; }
        public ReimbursementStatus? ReimbursementStatus { get; set; }
        public string? ResourceId { get; set; }
        /// <summary>True clears the link; omitted/false leaves ResourceId untouched when null.</summary>
        public bool ClearResourceLink { get; set; }
    }

    [HttpPut("{tripId}/documents/{docId}")]
    public async Task<ActionResult<TripDocumentMeta>> UpdateDocument(string tripId, string docId, [FromBody] UpdateDocumentRequest update)
    {
        var doc = await _db.TripDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.TripReportId == tripId);
        if (doc == null) return NotFound();
        if (doc.UserId != UserId && !await HasSharedAccessAsync("TripDocument", docId, requireEdit: true)) return NotFound();

        if (update.Amount.HasValue) doc.Amount = update.Amount;
        if (!string.IsNullOrWhiteSpace(update.Currency)) doc.Currency = update.Currency;
        if (update.ReimbursementStatus.HasValue) doc.ReimbursementStatus = update.ReimbursementStatus.Value.ToString();
        if (update.ClearResourceLink) doc.ResourceId = null;
        else if (update.ResourceId != null) doc.ResourceId = update.ResourceId;

        await _db.SaveChangesAsync();
        return Ok(doc.ToMeta());
    }

    [HttpDelete("{tripId}/documents/{docId}")]
    public async Task<ActionResult> DeleteDocument(string tripId, string docId)
    {
        var doc = await _db.TripDocuments
            .FirstOrDefaultAsync(d => d.Id == docId && d.TripReportId == tripId && d.UserId == UserId);
        if (doc == null) return NotFound();

        _db.TripDocuments.Remove(doc);
        await _db.SaveChangesAsync();

        if (doc.ContentGridFsId != null)
        {
            try { await _gridFs.DeleteAsync(ObjectId.Parse(doc.ContentGridFsId)); }
            catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for document {DocId}", doc.Id); }
        }

        if (doc.DriveFileId != null)
        {
            try { await _drive.TryDeleteAsync(UserId, doc.DriveFileId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Google Drive delete failed for document {DocId}", doc.Id); }
        }

        return NoContent();
    }
}
