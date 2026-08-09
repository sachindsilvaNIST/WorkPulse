using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.DTOs;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class SyncController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public SyncController(AppDbContext db) => _db = db;

    /// <summary>
    /// Push client data to server. Only upserts items where client timestamp is newer.
    /// </summary>
    [HttpPost("push")]
    public async Task<ActionResult<SyncResponse>> Push([FromBody] SyncRequest request)
    {
        // Upsert attendance months — only if client is newer
        foreach (var monthData in request.Months)
        {
            var existing = await _db.AttendanceMonths
                .Include(m => m.Records)
                .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == monthData.Year && m.Month == monthData.Month);

            if (existing != null)
            {
                // Only overwrite if client data is newer
                if (monthData.LastModifiedUtc > existing.LastModifiedUtc)
                {
                    existing.MonthLabel = monthData.MonthLabel;
                    existing.Title = monthData.Title;
                    existing.LastModifiedUtc = monthData.LastModifiedUtc;
                    _db.AttendanceRecords.RemoveRange(existing.Records);
                    existing.Records = monthData.Records.Select(r => r.ToEntity()).ToList();
                }
            }
            else
            {
                var entity = monthData.ToEntity(UserId);
                if (monthData.LastModifiedUtc != default)
                    entity.LastModifiedUtc = monthData.LastModifiedUtc;
                _db.AttendanceMonths.Add(entity);
            }
        }

        // Upsert contacts — per-contact timestamp comparison
        if (request.Contacts != null)
        {
            var existingContacts = await _db.Contacts
                .Where(c => c.UserId == UserId)
                .ToDictionaryAsync(c => c.Id);

            foreach (var contact in request.Contacts.Contacts)
            {
                if (existingContacts.TryGetValue(contact.Id, out var existing))
                {
                    // Only overwrite if client is newer
                    if (contact.LastModifiedUtc > existing.LastModifiedUtc)
                    {
                        existing.Affiliation = contact.Affiliation;
                        existing.FamilyName = contact.FamilyName;
                        existing.GivenName = contact.GivenName;
                        existing.Department = contact.Department;
                        existing.Email = contact.Email;
                        existing.Intercom = contact.Intercom;
                        existing.ContactNumber = contact.ContactNumber;
                        existing.Notes = contact.Notes;
                        existing.LastModifiedUtc = contact.LastModifiedUtc;
                    }
                }
                else
                {
                    // New contact from client
                    var entity = contact.ToEntity(UserId);
                    if (contact.LastModifiedUtc != default)
                        entity.LastModifiedUtc = contact.LastModifiedUtc;
                    _db.Contacts.Add(entity);
                }
            }
        }

        // Upsert quick links — per-link timestamp comparison
        if (request.QuickLinks != null)
        {
            var existingLinks = await _db.QuickLinks
                .Where(l => l.UserId == UserId)
                .ToDictionaryAsync(l => l.Id);

            foreach (var link in request.QuickLinks)
            {
                if (existingLinks.TryGetValue(link.Id, out var existing))
                {
                    if (link.LastModifiedUtc > existing.LastModifiedUtc)
                    {
                        existing.Label = link.Label;
                        existing.Url = link.Url;
                        existing.Category = link.Category;
                        existing.Keywords = link.Keywords;
                        existing.SortOrder = link.SortOrder;
                        existing.LastModifiedUtc = link.LastModifiedUtc;
                    }
                }
                else
                {
                    var entity = link.ToEntity(UserId);
                    if (link.LastModifiedUtc != default)
                        entity.LastModifiedUtc = link.LastModifiedUtc;
                    _db.QuickLinks.Add(entity);
                }
            }
        }

        // Upsert daily reports — per-report timestamp comparison
        if (request.DailyReports != null)
        {
            var existingDaily = await _db.DailyReports
                .Where(r => r.UserId == UserId)
                .ToDictionaryAsync(r => r.Id);

            foreach (var report in request.DailyReports)
            {
                if (existingDaily.TryGetValue(report.Id, out var existing))
                {
                    if (report.LastModifiedUtc > existing.LastModifiedUtc)
                    {
                        existing.ReportDate = report.ReportDate;
                        existing.Title = report.Title;
                        existing.Body = report.Body;
                        existing.LastModifiedUtc = report.LastModifiedUtc;
                    }
                }
                else
                {
                    var entity = report.ToEntity(UserId);
                    if (report.LastModifiedUtc != default)
                        entity.LastModifiedUtc = report.LastModifiedUtc;
                    _db.DailyReports.Add(entity);
                }
            }
        }

        // Upsert weekly reports — per-report timestamp comparison
        if (request.WeeklyReports != null)
        {
            var existingWeekly = await _db.WeeklyReports
                .Where(r => r.UserId == UserId)
                .ToDictionaryAsync(r => r.Id);

            foreach (var report in request.WeeklyReports)
            {
                if (existingWeekly.TryGetValue(report.Id, out var existing))
                {
                    if (report.LastModifiedUtc > existing.LastModifiedUtc)
                    {
                        existing.WeekStartDate = report.WeekStartDate;
                        existing.Title = report.Title;
                        existing.Body = report.Body;
                        existing.LastModifiedUtc = report.LastModifiedUtc;
                    }
                }
                else
                {
                    var entity = report.ToEntity(UserId);
                    if (report.LastModifiedUtc != default)
                        entity.LastModifiedUtc = report.LastModifiedUtc;
                    _db.WeeklyReports.Add(entity);
                }
            }
        }

        // Upsert trip reports — per-report timestamp comparison (documents are not synced
        // this way; the desktop client fetches/uploads them live via the API)
        if (request.TripReports != null)
        {
            var existingTrips = await _db.TripReports
                .Where(t => t.UserId == UserId)
                .ToDictionaryAsync(t => t.Id);

            foreach (var trip in request.TripReports)
            {
                if (existingTrips.TryGetValue(trip.Id, out var existing))
                {
                    if (trip.LastModifiedUtc > existing.LastModifiedUtc)
                    {
                        existing.Category = trip.Category.ToString();
                        existing.Destination = trip.Destination;
                        existing.StartDate = trip.StartDate;
                        existing.EndDate = trip.EndDate;
                        existing.Purpose = trip.Purpose;
                        existing.Notes = trip.Notes;
                        existing.LastModifiedUtc = trip.LastModifiedUtc;
                    }
                }
                else
                {
                    var entity = trip.ToEntity(UserId);
                    if (trip.LastModifiedUtc != default)
                        entity.LastModifiedUtc = trip.LastModifiedUtc;
                    _db.TripReports.Add(entity);
                }
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new SyncResponse { ServerTimestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Pull all server data modified since the given timestamp.
    /// </summary>
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

        var quickLinks = await _db.QuickLinks
            .Where(l => l.UserId == UserId && l.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        var dailyReports = await _db.DailyReports
            .Where(r => r.UserId == UserId && r.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        var weeklyReports = await _db.WeeklyReports
            .Where(r => r.UserId == UserId && r.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        var tripReports = await _db.TripReports
            .Where(t => t.UserId == UserId && t.LastModifiedUtc > request.LastSyncedAt)
            .ToListAsync();

        return Ok(new SyncResponse
        {
            Months = months.Select(m => m.ToMonthlyData()).ToList(),
            Contacts = contacts.Count > 0
                ? new ContactBookData { Contacts = contacts.Select(c => c.ToContactRecord()).ToList() }
                : null,
            QuickLinks = quickLinks.Count > 0
                ? quickLinks.Select(l => l.ToQuickLink()).ToList()
                : null,
            DailyReports = dailyReports.Count > 0
                ? dailyReports.Select(r => r.ToDailyReport()).ToList()
                : null,
            WeeklyReports = weeklyReports.Count > 0
                ? weeklyReports.Select(r => r.ToWeeklyReport()).ToList()
                : null,
            TripReports = tripReports.Count > 0
                ? tripReports.Select(t => t.ToTripReport()).ToList()
                : null,
            ServerTimestamp = DateTime.UtcNow
        });
    }
}

public class SyncPullRequest
{
    public DateTime LastSyncedAt { get; set; }
}
