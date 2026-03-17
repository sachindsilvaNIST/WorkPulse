using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NistAttendance.Api.Data;
using NistAttendance.Api.Mapping;
using NistAttendance.DTOs;
using NistAttendance.Models;

namespace NistAttendance.Api.Controllers;

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

        return Ok(new SyncResponse
        {
            Months = months.Select(m => m.ToMonthlyData()).ToList(),
            Contacts = contacts.Count > 0
                ? new ContactBookData { Contacts = contacts.Select(c => c.ToContactRecord()).ToList() }
                : null,
            ServerTimestamp = DateTime.UtcNow
        });
    }
}

public class SyncPullRequest
{
    public DateTime LastSyncedAt { get; set; }
}
