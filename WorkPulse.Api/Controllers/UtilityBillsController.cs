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
public class UtilityBillsController : ApiControllerBase
{
    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB

    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;
    private readonly ShareAccessService _shareAccess;
    private readonly GridFSBucket _gridFs;
    private readonly ILogger<UtilityBillsController> _logger;

    public UtilityBillsController(AppDbContext db, GoogleDriveService drive, ShareAccessService shareAccess, GridFSBucket gridFs, ILogger<UtilityBillsController> logger)
    {
        _db = db;
        _drive = drive;
        _shareAccess = shareAccess;
        _gridFs = gridFs;
        _logger = logger;
    }

    private async Task<bool> HasSharedAccessAsync(string resourceType, string resourceId, bool requireEdit = false)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        var permission = await _shareAccess.GetEffectivePermissionAsync(resourceType, resourceId, email);
        if (permission == null) return false;
        return !requireEdit || permission == "Edit";
    }

    private async Task<List<UtilityBillEntity>> LoadEntitiesAsync() =>
        await _db.UtilityBills.Where(b => b.UserId == UserId).ToListAsync();

    private static string? Validate(UtilityBill record)
    {
        if (record.AmountJpy <= 0) return "Amount must be greater than zero.";
        if (record.BillingMonth is < 1 or > 12) return "Billing month must be between 1 and 12.";
        if (record.DueDate == default) return "Due date is required.";
        if (record.PaidDate.HasValue && record.PeriodStart.HasValue && record.PaidDate < record.PeriodStart)
            return "Paid date can't be before the period start.";
        return null;
    }

    // ===== BILLS =====

    [HttpGet]
    public async Task<ActionResult<List<UtilityBill>>> GetAll([FromQuery] string? provider, [FromQuery] int? year, [FromQuery] string? status)
    {
        var entities = await LoadEntitiesAsync();

        // Materialized then grouped in-memory, same as TripReportsController.GetAll.
        var docs = await _db.UtilityBillDocuments.Where(d => d.UserId == UserId).ToListAsync();
        var counts = docs.GroupBy(d => d.UtilityBillId).ToDictionary(g => g.Key, g => g.Count());

        IEnumerable<UtilityBill> bills = entities.Select(e =>
        {
            var dto = e.ToUtilityBill();
            dto.DocumentCount = counts.GetValueOrDefault(e.Id, 0);
            return dto;
        });

        if (Enum.TryParse<UtilityProvider>(provider, out var p)) bills = bills.Where(b => b.Provider == p);
        if (year.HasValue) bills = bills.Where(b => b.BillingYear == year.Value);
        // Status is computed, not stored, so it can't be filtered in the database query.
        if (Enum.TryParse<UtilityBillStatus>(status, out var s)) bills = bills.Where(b => b.Status == s);

        return Ok(bills.OrderByDescending(b => b.DueDate).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UtilityBill>> Get(string id)
    {
        var entity = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync("UtilityBill", id)) return NotFound();
        return Ok(entity.ToUtilityBill());
    }

    [HttpPost]
    public async Task<ActionResult<UtilityBill>> Create([FromBody] UtilityBill record)
    {
        var error = Validate(record);
        if (error != null) return BadRequest(new { error });

        var entity = record.ToEntity(UserId);
        _db.UtilityBills.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToUtilityBill());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UtilityBill>> Update(string id, [FromBody] UtilityBill record)
    {
        var entity = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync("UtilityBill", id, requireEdit: true)) return NotFound();

        var error = Validate(record);
        if (error != null) return BadRequest(new { error });

        entity.Provider = record.Provider.ToString();
        entity.BillingYear = record.BillingYear;
        entity.BillingMonth = record.BillingMonth;
        entity.PeriodStart = record.PeriodStart;
        entity.PeriodEnd = record.PeriodEnd;
        entity.MeterReadingDate = record.MeterReadingDate;
        entity.UsageAmount = record.UsageAmount;
        entity.UsageUnit = string.IsNullOrWhiteSpace(record.UsageUnit) ? "m³" : record.UsageUnit;
        entity.SewerUsageAmount = record.SewerUsageAmount;
        entity.AmountJpy = record.AmountJpy;
        entity.DueDate = record.DueDate;
        entity.PaidDate = record.PaidDate;
        entity.PaymentMethod = record.PaymentMethod?.ToString();
        entity.ReceiptRef = record.ReceiptRef;
        entity.Notes = record.Notes;
        entity.LastModifiedUtc = DateTime.UtcNow;

        // Breakdown is a single embedded sub-document (OwnsOne) — update in place when it already
        // exists, same as TripReportsController.SaveSettlement, rather than replacing the reference.
        if (record.Breakdown == null)
            entity.Breakdown = null;
        else if (entity.Breakdown == null)
            entity.Breakdown = record.Breakdown.ToEntity();
        else
        {
            entity.Breakdown.WaterCharge = record.Breakdown.WaterCharge;
            entity.Breakdown.SewerCharge = record.Breakdown.SewerCharge;
            entity.Breakdown.ConsumptionTax = record.Breakdown.ConsumptionTax;
            entity.Breakdown.SlipIssuingFee = record.Breakdown.SlipIssuingFee;
            entity.Breakdown.LateInterest = record.Breakdown.LateInterest;
        }

        await _db.SaveChangesAsync();
        return Ok(entity.ToUtilityBill());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == id && b.UserId == UserId);
        if (entity == null) return NotFound();

        // Mongo has no cascade-delete, so attached receipts (and their GridFS/Drive copies) are
        // cleaned up explicitly here, same as TripReportsController.Delete.
        var docs = await _db.UtilityBillDocuments.Where(d => d.UtilityBillId == id && d.UserId == UserId).ToListAsync();
        _db.UtilityBillDocuments.RemoveRange(docs);
        _db.UtilityBills.Remove(entity);
        await _db.SaveChangesAsync();

        foreach (var doc in docs)
            await DeleteBlobsAsync(doc);

        return NoContent();
    }

    public class MarkPaidRequest
    {
        public DateOnly PaidDate { get; set; }
        public UtilityPaymentMethod? PaymentMethod { get; set; }
    }

    [HttpPost("{id}/mark-paid")]
    public async Task<ActionResult<UtilityBill>> MarkPaid(string id, [FromBody] MarkPaidRequest request)
    {
        var entity = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync("UtilityBill", id, requireEdit: true)) return NotFound();

        if (entity.PeriodStart.HasValue && request.PaidDate < entity.PeriodStart)
            return BadRequest(new { error = "Paid date can't be before the period start." });

        entity.PaidDate = request.PaidDate;
        if (request.PaymentMethod.HasValue) entity.PaymentMethod = request.PaymentMethod.Value.ToString();
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToUtilityBill());
    }

    // ===== DOCUMENTS (receipts / stamped slips) =====

    [HttpGet("{billId}/documents")]
    public async Task<ActionResult<List<UtilityBillDocumentMeta>>> GetDocuments(string billId)
    {
        var bill = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == UserId);
        if (bill == null) return NotFound();

        var docs = await _db.UtilityBillDocuments
            .Where(d => d.UtilityBillId == billId && d.UserId == UserId)
            .ToListAsync();
        return Ok(docs.OrderByDescending(d => d.UploadedUtc).Select(d => d.ToMeta()).ToList());
    }

    [HttpPost("{billId}/documents")]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<UtilityBillDocumentMeta>> UploadDocument(string billId, IFormFile file)
    {
        var bill = await _db.UtilityBills.FirstOrDefaultAsync(b => b.Id == billId && b.UserId == UserId);
        if (bill == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });
        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = "File exceeds the 50 MB limit" });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        var bytes = stream.ToArray();

        var gridFsId = await _gridFs.UploadFromBytesAsync(file.FileName, bytes);

        var entity = new UtilityBillDocumentEntity
        {
            UtilityBillId = billId,
            UserId = UserId,
            FileName = file.FileName,
            ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
            SizeBytes = file.Length,
            ContentGridFsId = gridFsId.ToString(),
            UploadedUtc = DateTime.UtcNow
        };
        _db.UtilityBillDocuments.Add(entity);
        await _db.SaveChangesAsync();

        // Best-effort Drive mirror, same as trip documents — the GridFS copy above is the guaranteed one.
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
            _logger.LogWarning(ex, "Google Drive mirror upload failed for utility bill document {DocId}", entity.Id);
        }

        return Ok(entity.ToMeta());
    }

    [HttpGet("{billId}/documents/{docId}")]
    public async Task<ActionResult> DownloadDocument(string billId, string docId)
    {
        var doc = await _db.UtilityBillDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.UtilityBillId == billId && d.UserId == UserId);
        if (doc == null || doc.ContentGridFsId == null) return NotFound();

        var bytes = await _gridFs.DownloadAsBytesAsync(ObjectId.Parse(doc.ContentGridFsId));
        return File(bytes, doc.ContentType, doc.FileName);
    }

    [HttpDelete("{billId}/documents/{docId}")]
    public async Task<ActionResult> DeleteDocument(string billId, string docId)
    {
        var doc = await _db.UtilityBillDocuments.FirstOrDefaultAsync(d => d.Id == docId && d.UtilityBillId == billId && d.UserId == UserId);
        if (doc == null) return NotFound();

        _db.UtilityBillDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        await DeleteBlobsAsync(doc);

        return NoContent();
    }

    private async Task DeleteBlobsAsync(UtilityBillDocumentEntity doc)
    {
        if (doc.ContentGridFsId != null)
        {
            try { await _gridFs.DeleteAsync(ObjectId.Parse(doc.ContentGridFsId)); }
            catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for utility bill document {DocId}", doc.Id); }
        }
        if (doc.DriveFileId != null)
        {
            try { await _drive.TryDeleteAsync(UserId, doc.DriveFileId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Google Drive delete failed for utility bill document {DocId}", doc.Id); }
        }
    }

    // ===== SUMMARY & CHARTS =====

    [HttpGet("summary")]
    public async Task<ActionResult<UtilityBillSummary>> GetSummary()
    {
        var bills = (await LoadEntitiesAsync()).Select(e => e.ToUtilityBill()).ToList();
        var today = UtilityBillStatusCalculator.TodayJst();

        var paidThisMonth = bills
            .Where(b => b.PaidDate is { } p && p.Year == today.Year && p.Month == today.Month)
            .Sum(b => b.AmountJpy);
        var paidYtd = bills
            .Where(b => b.PaidDate is { } p && p.Year == today.Year)
            .Sum(b => b.AmountJpy);

        var unpaid = bills.Where(b => b.Status != UtilityBillStatus.Paid).ToList();

        return Ok(new UtilityBillSummary
        {
            TotalThisMonth = paidThisMonth,
            YearToDate = paidYtd,
            MonthlyAverage = paidYtd / (decimal)today.Month,
            UnpaidCount = unpaid.Count,
            OverdueCount = unpaid.Count(b => b.Status == UtilityBillStatus.Overdue),
            NextDueBill = unpaid.OrderBy(b => b.DueDate).FirstOrDefault()
        });
    }

    [HttpGet("charts/monthly")]
    public async Task<ActionResult<List<UtilityBillMonthlyChartPoint>>> GetMonthlyChart([FromQuery] int months = 12, [FromQuery] bool spreadBimonthly = false)
    {
        var points = UtilityBillAggregator.BuildMonthlyCost(await LoadEntitiesAsync(), spreadBimonthly);
        return Ok(FilterToWindow(points, months, p => (p.Year, p.Month)));
    }

    [HttpGet("charts/usage")]
    public async Task<ActionResult<List<UtilityBillUsageChartPoint>>> GetUsageChart([FromQuery] int months = 12)
    {
        var points = UtilityBillAggregator.BuildUsage(await LoadEntitiesAsync());
        return Ok(FilterToWindow(points, months, p => (p.Year, p.Month)));
    }

    /// <summary>The same calendar month across every year the user has bills for.</summary>
    [HttpGet("charts/yoy")]
    public async Task<ActionResult<List<UtilityBillMonthlyChartPoint>>> GetYearOverYear([FromQuery] int month)
    {
        if (month is < 1 or > 12) return BadRequest(new { error = "Month must be between 1 and 12." });

        var points = UtilityBillAggregator.BuildMonthlyCost(await LoadEntitiesAsync(), spreadBimonthly: false)
            .Where(p => p.Month == month)
            .ToList();
        return Ok(points);
    }

    /// <summary>Keeps only points inside the trailing window ending at the current JST month.</summary>
    private static List<T> FilterToWindow<T>(IEnumerable<T> points, int months, Func<T, (int Year, int Month)> key)
    {
        var today = UtilityBillStatusCalculator.TodayJst();
        var endKey = today.Year * 12 + today.Month;
        var startKey = endKey - (Math.Max(1, months) - 1);
        return points
            .Where(p => { var (y, m) = key(p); var k = y * 12 + m; return k >= startKey && k <= endKey; })
            .ToList();
    }

    // ===== PROVIDER SETTINGS =====

    [HttpGet("provider-settings")]
    public async Task<ActionResult<List<UtilityProviderSettings>>> GetProviderSettings()
    {
        var rows = await _db.UtilityProviderSettings.Where(s => s.UserId == UserId).ToListAsync();
        return Ok(rows.Select(r => r.ToUtilityProviderSettings()).ToList());
    }

    [HttpPut("provider-settings/{provider}")]
    public async Task<ActionResult<UtilityProviderSettings>> SaveProviderSettings(string provider, [FromBody] UtilityProviderSettings request)
    {
        if (!Enum.TryParse<UtilityProvider>(provider, out var parsed))
            return BadRequest(new { error = "Unknown provider." });

        var providerName = parsed.ToString();
        var entity = await _db.UtilityProviderSettings
            .FirstOrDefaultAsync(s => s.UserId == UserId && s.Provider == providerName);

        if (entity == null)
        {
            entity = new UtilityProviderSettingsEntity { UserId = UserId, Provider = providerName };
            _db.UtilityProviderSettings.Add(entity);
        }

        entity.CustomerNumber = request.CustomerNumber?.Trim() ?? "";
        entity.CurrentPaymentMethod = request.CurrentPaymentMethod?.ToString();
        entity.PaymentMethodChangedDate = request.PaymentMethodChangedDate;

        await _db.SaveChangesAsync();
        return Ok(entity.ToUtilityProviderSettings());
    }
}
