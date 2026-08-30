using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;
using WorkPulse.DTOs;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class ExcelController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public ExcelController(AppDbContext db) => _db = db;

    // Existing contract, untouched — the desktop and Blazor web apps already call this with the
    // month data they hold locally (no DB round-trip needed on their end), so this endpoint's
    // request/response shape can't change. `format` is new but optional/defaulted, so those
    // existing callers are unaffected.
    [HttpPost("attendance/export")]
    public ActionResult ExportAttendance([FromBody] List<MonthlyData> months, [FromQuery] string format = "xlsx")
    {
        if (format == "html")
        {
            var html = StreamExcelExportService.ExportAttendanceToHtml(months);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "attendance.html");
        }
        var stream = StreamExcelExportService.ExportAttendanceToStream(months);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "attendance.xlsx");
    }

    // Next.js-specific: the dashboard only ever has the currently-viewed settlement period's data
    // loaded client-side, not arbitrary other months, so exporting "any 1+ months the user picks"
    // needs the server to fetch by (year, month) instead of requiring the frontend to pre-fetch
    // every selected month's full record set first just to re-upload it here.
    [HttpPost("attendance/export-by-month")]
    public async Task<ActionResult> ExportAttendanceByMonth([FromBody] List<YearMonthDto> months, [FromQuery] string format = "xlsx")
    {
        if (months.Count == 0)
            return BadRequest(new { error = "Select at least one month." });

        var data = new List<MonthlyData>();
        foreach (var ym in months.OrderBy(m => m.Year).ThenBy(m => m.Month))
        {
            var entity = await _db.AttendanceMonths
                .Include(m => m.Records)
                .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == ym.Year && m.Month == ym.Month);
            if (entity != null)
                data.Add(entity.ToMonthlyData());
        }

        if (format == "html")
        {
            var html = StreamExcelExportService.ExportAttendanceToHtml(data);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "attendance.html");
        }
        var stream = StreamExcelExportService.ExportAttendanceToStream(data);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "attendance.xlsx");
    }

    [HttpPost("attendance/import")]
    public async Task<ActionResult<List<MonthlyData>>> ImportAttendance(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        var months = StreamExcelImportService.ImportAttendanceFromStream(stream);
        return Ok(months);
    }

    [HttpPost("daily-reports/export")]
    public async Task<ActionResult> ExportDailyReports([FromBody] List<string> ids, [FromQuery] string format = "xlsx")
    {
        if (ids.Count == 0)
            return BadRequest(new { error = "Select at least one report." });

        var reports = await _db.DailyReports.Where(r => r.UserId == UserId && ids.Contains(r.Id)).ToListAsync();
        var items = reports.Select(r => new NoteExportItem(r.ReportDate, r.Title, r.Body)).ToList();

        if (format == "html")
        {
            var html = NoteExportService.ExportToHtml("Daily Reports", items);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "daily-reports.html");
        }
        var stream = NoteExportService.ExportToXlsx("Daily Reports", items);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "daily-reports.xlsx");
    }

    [HttpPost("weekly-reports/export")]
    public async Task<ActionResult> ExportWeeklyReports([FromBody] List<string> ids, [FromQuery] string format = "xlsx")
    {
        if (ids.Count == 0)
            return BadRequest(new { error = "Select at least one report." });

        var reports = await _db.WeeklyReports.Where(r => r.UserId == UserId && ids.Contains(r.Id)).ToListAsync();
        var items = reports.Select(r => new NoteExportItem(r.WeekStartDate, r.Title, r.Body)).ToList();

        if (format == "html")
        {
            var html = NoteExportService.ExportToHtml("Weekly Reports", items);
            return File(Encoding.UTF8.GetBytes(html), "text/html", "weekly-reports.html");
        }
        var stream = NoteExportService.ExportToXlsx("Weekly Reports", items);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "weekly-reports.xlsx");
    }

    [HttpPost("contacts/export")]
    public ActionResult ExportContacts([FromBody] List<ContactRecord> contacts)
    {
        var stream = StreamExcelExportService.ExportContactsToStream(contacts);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contacts.xlsx");
    }
}
