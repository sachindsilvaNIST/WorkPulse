using System.IO.Compression;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class ExportController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public ExportController(AppDbContext db) => _db = db;

    /// <summary>Everything the user owns, as one ZIP — a single data.json with every structured
    /// record (attendance, reports, trips, reimbursement, bookmarks, resources, contacts,
    /// settings) plus the actual binary files (trip documents, resource files), each in their own
    /// folder. This is the app's only full backup: every other export is one section at a time,
    /// and both the API and its database run on Render's free tier, which is exactly the kind of
    /// infrastructure that gets reset or expired without much warning.</summary>
    [HttpGet("all")]
    public async Task<ActionResult> ExportAll()
    {
        var months = await _db.AttendanceMonths.Include(m => m.Records).Where(m => m.UserId == UserId).ToListAsync();
        var dailyReports = await _db.DailyReports.Where(r => r.UserId == UserId).ToListAsync();
        var weeklyReports = await _db.WeeklyReports.Where(r => r.UserId == UserId).ToListAsync();
        var trips = await _db.TripReports.Where(t => t.UserId == UserId).ToListAsync();
        var tripDocs = await _db.TripDocuments.Where(d => d.UserId == UserId).ToListAsync();
        var categories = await _db.ReimbursementCategories.Where(c => c.UserId == UserId).ToListAsync();
        var bookmarks = await _db.QuickLinks.Where(l => l.UserId == UserId).ToListAsync();
        var resources = await _db.Resources.Where(r => r.UserId == UserId).ToListAsync();
        var contacts = await _db.Contacts.Where(c => c.UserId == UserId).ToListAsync();
        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);

        var data = new
        {
            ExportedUtc = DateTime.UtcNow,
            Attendance = months.Select(m => m.ToMonthlyData()),
            DailyReports = dailyReports.Select(r => r.ToDailyReport()),
            WeeklyReports = weeklyReports.Select(r => r.ToWeeklyReport()),
            BusinessTrips = trips.Select(t => t.ToTripReport()),
            TripDocuments = tripDocs.Select(d => d.ToMeta()),
            ReimbursementCategories = categories.Select(c => c.ToDto()),
            Bookmarks = bookmarks.Select(l => l.ToQuickLink()),
            Resources = resources.Select(r => r.ToMeta()),
            Contacts = contacts.Select(c => c.ToContactRecord()),
            Settings = settings?.ToAppSettings()
        };

        using var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            var jsonEntry = archive.CreateEntry("data.json", CompressionLevel.Optimal);
            await using (var entryStream = jsonEntry.Open())
            {
                await JsonSerializer.SerializeAsync(entryStream, data, new JsonSerializerOptions { WriteIndented = true });
            }

            // Actual files, not just their metadata — a "backup" that skipped the real receipts/
            // scans would miss the whole point. One subfolder per trip destination so a large
            // export is still browsable without unzipping into a flat pile.
            foreach (var doc in tripDocs)
            {
                var tripName = trips.FirstOrDefault(t => t.Id == doc.TripReportId)?.Destination ?? "Unknown Trip";
                var fileName = string.IsNullOrWhiteSpace(doc.Label) ? doc.FileName : doc.Label;
                var entry = archive.CreateEntry(
                    $"trip-documents/{SanitizePathSegment(tripName)}/{doc.Id}-{SanitizePathSegment(fileName)}",
                    CompressionLevel.Optimal);
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(doc.Content);
            }

            foreach (var res in resources.Where(r => r.Type == "File"))
            {
                var entry = archive.CreateEntry($"resources/{res.Id}-{SanitizePathSegment(res.FileName)}", CompressionLevel.Optimal);
                await using var entryStream = entry.Open();
                await entryStream.WriteAsync(res.Content);
            }
        }

        var fileNameOut = $"workpulse-backup-{DateTime.UtcNow:yyyy-MM-dd}.zip";
        return File(zipStream.ToArray(), "application/zip", fileNameOut);
    }

    private static string SanitizePathSegment(string name)
    {
        var cleaned = name;
        foreach (var c in Path.GetInvalidFileNameChars()) cleaned = cleaned.Replace(c, '_');
        return string.IsNullOrWhiteSpace(cleaned) ? "untitled" : cleaned;
    }

    /// <summary>Restores a ZIP from ExportAll — the other half of the backup. Merges rather than
    /// replaces: anything already present (matched by id, or by year/month for Attendance and by
    /// name for Reimbursement categories, since those two don't have a meaningful cross-account
    /// id) is left untouched and just counted as skipped, so running this against an account that
    /// already has some data can't lose or overwrite anything.</summary>
    [HttpPost("restore")]
    [RequestSizeLimit(209_715_200)]
    public async Task<ActionResult<RestoreSummary>> Restore(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded." });

        using var zipStream = new MemoryStream();
        await file.CopyToAsync(zipStream);
        zipStream.Position = 0;

        using var archive = TryOpenZip(zipStream);
        if (archive == null)
            return BadRequest(new { error = "That doesn't look like a valid backup file." });

        var dataEntry = archive.GetEntry("data.json");
        if (dataEntry == null)
            return BadRequest(new { error = "Not a WorkPulse backup file (missing data.json)." });

        ExportBundle? bundle;
        await using (var entryStream = dataEntry.Open())
        {
            bundle = await JsonSerializer.DeserializeAsync<ExportBundle>(
                entryStream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        if (bundle == null)
            return BadRequest(new { error = "Could not read the backup file's contents." });

        var summary = new RestoreSummary();

        // Attendance is matched by (Year, Month), not an id — MonthlyData never carries the
        // underlying AttendanceMonthEntity's own auto-incrementing Id.
        foreach (var month in bundle.Attendance)
        {
            if (await _db.AttendanceMonths.AnyAsync(m => m.UserId == UserId && m.Year == month.Year && m.Month == month.Month))
            {
                summary.Skipped++;
                continue;
            }
            _db.AttendanceMonths.Add(month.ToEntity(UserId));
            summary.Restored++;
        }

        foreach (var report in bundle.DailyReports)
        {
            if (await _db.DailyReports.AnyAsync(r => r.Id == report.Id && r.UserId == UserId)) { summary.Skipped++; continue; }
            _db.DailyReports.Add(report.ToEntity(UserId));
            summary.Restored++;
        }

        foreach (var report in bundle.WeeklyReports)
        {
            if (await _db.WeeklyReports.AnyAsync(r => r.Id == report.Id && r.UserId == UserId)) { summary.Skipped++; continue; }
            _db.WeeklyReports.Add(report.ToEntity(UserId));
            summary.Restored++;
        }

        foreach (var trip in bundle.BusinessTrips)
        {
            if (await _db.TripReports.AnyAsync(t => t.Id == trip.Id && t.UserId == UserId)) { summary.Skipped++; continue; }
            _db.TripReports.Add(trip.ToEntity(UserId));
            summary.Restored++;
        }

        // Reimbursement categories are matched by name (case-insensitive) — like Attendance, the
        // exported id is a DB identity value with no meaning outside the account it came from.
        foreach (var category in bundle.ReimbursementCategories)
        {
            var nameLower = category.Name.ToLowerInvariant();
            if (await _db.ReimbursementCategories.AnyAsync(c => c.UserId == UserId && c.Name.ToLower() == nameLower))
            {
                summary.Skipped++;
                continue;
            }
            _db.ReimbursementCategories.Add(new ReimbursementCategoryEntity { UserId = UserId, Name = category.Name });
            summary.Restored++;
        }

        foreach (var link in bundle.Bookmarks)
        {
            if (await _db.QuickLinks.AnyAsync(l => l.Id == link.Id && l.UserId == UserId)) { summary.Skipped++; continue; }
            _db.QuickLinks.Add(link.ToEntity(UserId));
            summary.Restored++;
        }

        foreach (var contact in bundle.Contacts)
        {
            if (await _db.Contacts.AnyAsync(c => c.Id == contact.Id && c.UserId == UserId)) { summary.Skipped++; continue; }
            _db.Contacts.Add(contact.ToEntity(UserId));
            summary.Restored++;
        }

        // Settings only ever get restored into an account that has none yet — an existing
        // account's current preferences are never silently replaced by whatever a backup happened
        // to capture.
        if (bundle.Settings != null && !await _db.UserSettings.AnyAsync(s => s.UserId == UserId))
        {
            _db.UserSettings.Add(bundle.Settings.ToEntity(UserId));
            summary.Restored++;
        }

        // Trip documents need their parent trip to exist first (either already there, or just
        // added above in this same request) — TripReports is saved before this runs via the
        // SaveChanges below only applying once, so check against what's now tracked in-memory too.
        var knownTripIds = new HashSet<string>(await _db.TripReports.Where(t => t.UserId == UserId).Select(t => t.Id).ToListAsync());
        foreach (var e in _db.ChangeTracker.Entries<TripReportEntity>())
            if (e.State == EntityState.Added) knownTripIds.Add(e.Entity.Id);

        foreach (var doc in bundle.TripDocuments)
        {
            if (await _db.TripDocuments.AnyAsync(d => d.Id == doc.Id && d.UserId == UserId)) { summary.Skipped++; continue; }
            if (!knownTripIds.Contains(doc.TripReportId)) { summary.Skipped++; continue; }

            _db.TripDocuments.Add(new TripDocumentEntity
            {
                Id = doc.Id,
                TripReportId = doc.TripReportId,
                UserId = UserId,
                Category = doc.Category,
                Label = doc.Label,
                FileName = doc.FileName,
                ContentType = doc.ContentType,
                SizeBytes = doc.SizeBytes,
                Content = ReadZipFile(archive, "trip-documents/", doc.Id) ?? Array.Empty<byte>(),
                UploadedUtc = doc.UploadedUtc,
                DocumentDate = doc.DocumentDate,
                Amount = doc.Amount,
                Currency = doc.Currency,
                ReimbursementStatus = doc.ReimbursementStatus.ToString(),
                ResourceId = doc.ResourceId
            });
            summary.Restored++;
        }

        foreach (var res in bundle.Resources)
        {
            if (await _db.Resources.AnyAsync(r => r.Id == res.Id && r.UserId == UserId)) { summary.Skipped++; continue; }

            _db.Resources.Add(new ResourceEntity
            {
                Id = res.Id,
                UserId = UserId,
                Type = res.Type,
                Title = res.Title,
                Notes = res.Notes,
                Url = res.Url,
                FileName = res.FileName,
                ContentType = res.ContentType,
                SizeBytes = res.SizeBytes,
                Content = res.Type == "File" ? ReadZipFile(archive, "resources/", res.Id) ?? Array.Empty<byte>() : Array.Empty<byte>(),
                Tags = res.Tags,
                Keywords = res.Keywords,
                CreatedUtc = res.CreatedUtc,
                LastModifiedUtc = res.LastModifiedUtc
            });
            summary.Restored++;
        }

        await _db.SaveChangesAsync();
        return Ok(summary);
    }

    private static ZipArchive? TryOpenZip(Stream stream)
    {
        try
        {
            return new ZipArchive(stream, ZipArchiveMode.Read);
        }
        catch (InvalidDataException)
        {
            return null;
        }
    }

    /// <summary>Finds a file under `folderPrefix` whose name starts with `id-` (the naming scheme
    /// ExportAll writes) regardless of the rest of the path — trip documents live one directory
    /// deeper (under the trip's destination name), so this can't just look up an exact path.</summary>
    private static byte[]? ReadZipFile(ZipArchive archive, string folderPrefix, string id)
    {
        var entry = archive.Entries.FirstOrDefault(e => e.FullName.StartsWith(folderPrefix, StringComparison.Ordinal) && e.Name.StartsWith(id + "-", StringComparison.Ordinal));
        if (entry == null) return null;
        using var stream = entry.Open();
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }
}

public class ExportBundle
{
    public DateTime ExportedUtc { get; set; }
    public List<MonthlyData> Attendance { get; set; } = new();
    public List<DailyReport> DailyReports { get; set; } = new();
    public List<WeeklyReport> WeeklyReports { get; set; } = new();
    public List<TripReport> BusinessTrips { get; set; } = new();
    public List<TripDocumentMeta> TripDocuments { get; set; } = new();
    public List<ReimbursementCategory> ReimbursementCategories { get; set; } = new();
    public List<QuickLink> Bookmarks { get; set; } = new();
    public List<ResourceMeta> Resources { get; set; } = new();
    public List<ContactRecord> Contacts { get; set; } = new();
    public AppSettings? Settings { get; set; }
}

public class RestoreSummary
{
    public int Restored { get; set; }
    public int Skipped { get; set; }
}
