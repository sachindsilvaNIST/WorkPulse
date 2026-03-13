using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NistAttendance.Api.Data;
using NistAttendance.Api.Mapping;
using NistAttendance.DTOs;

namespace NistAttendance.Api.Controllers;

[Route("api/[controller]")]
public class SyncController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public SyncController(AppDbContext db) => _db = db;

    [HttpPost("push")]
    public async Task<ActionResult<SyncResponse>> Push([FromBody] SyncRequest request)
    {
        // Upsert attendance months
        foreach (var monthData in request.Months)
        {
            var existing = await _db.AttendanceMonths
                .Include(m => m.Records)
                .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == monthData.Year && m.Month == monthData.Month);

            if (existing != null)
            {
                // Last-write-wins: client is pushing, so client data wins
                existing.MonthLabel = monthData.MonthLabel;
                existing.Title = monthData.Title;
                existing.LastModifiedUtc = DateTime.UtcNow;
                _db.AttendanceRecords.RemoveRange(existing.Records);
                existing.Records = monthData.Records.Select(r => r.ToEntity()).ToList();
            }
            else
            {
                _db.AttendanceMonths.Add(monthData.ToEntity(UserId));
            }
        }

        // Upsert contacts
        if (request.Contacts != null)
        {
            var existingContacts = await _db.Contacts.Where(c => c.UserId == UserId).ToListAsync();
            _db.Contacts.RemoveRange(existingContacts);
            foreach (var contact in request.Contacts.Contacts)
            {
                _db.Contacts.Add(contact.ToEntity(UserId));
            }
        }

        // Upsert settings
        if (request.Settings != null)
        {
            var existingSettings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);
            if (existingSettings != null)
            {
                existingSettings.StandardLoginTime = request.Settings.StandardLoginTime;
                existingSettings.StandardLogoutTime = request.Settings.StandardLogoutTime;
                existingSettings.OvertimeBreakDeductionMinutes = request.Settings.OvertimeBreakDeductionMinutes;
                existingSettings.DefaultTitle = request.Settings.DefaultTitle;
                existingSettings.ThemeVariant = request.Settings.ThemeVariant;
                existingSettings.FontSizePreset = request.Settings.FontSizePreset;
            }
            else
            {
                _db.UserSettings.Add(request.Settings.ToEntity(UserId));
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new SyncResponse { ServerTimestamp = DateTime.UtcNow });
    }

    [HttpPost("pull")]
    public async Task<ActionResult<SyncResponse>> Pull([FromBody] SyncPullRequest request)
    {
        var months = await _db.AttendanceMonths
            .Include(m => m.Records)
            .Where(m => m.UserId == UserId && m.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        var contacts = await _db.Contacts
            .Where(c => c.UserId == UserId && c.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);

        return Ok(new SyncResponse
        {
            Months = months.Select(m => m.ToMonthlyData()).ToList(),
            Contacts = contacts.Count > 0
                ? new Models.ContactBookData { Contacts = contacts.Select(c => c.ToContactRecord()).ToList() }
                : null,
            Settings = settings?.ToAppSettings(),
            ServerTimestamp = DateTime.UtcNow
        });
    }
}

public class SyncPullRequest
{
    public DateTime LastSyncedAt { get; set; }
}
