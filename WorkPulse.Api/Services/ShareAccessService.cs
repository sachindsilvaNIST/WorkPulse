using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;

namespace WorkPulse.Api.Services;

/// <summary>The one place every entity controller's read/update endpoints ask "does this
/// non-owner have access, and at what level" — called only as the fallback once the normal
/// UserId-ownership check has already failed, so an owner's own requests never pay this extra
/// query.</summary>
public class ShareAccessService
{
    private readonly AppDbContext _db;

    public ShareAccessService(AppDbContext db) => _db = db;

    /// <summary>Returns null (no access), "Read", or "Edit" for the given item and requester,
    /// matched by the requester's own account email against every grant on that item — a person
    /// can be invited before they have an account, so matching by email rather than a stored
    /// UserId is deliberate, not a workaround.</summary>
    public async Task<string?> GetEffectivePermissionAsync(string resourceType, string resourceId, string requesterEmail)
    {
        if (string.IsNullOrWhiteSpace(requesterEmail)) return null;

        var grant = await _db.ShareGrants
            .Where(g => g.Email.ToLower() == requesterEmail.ToLower())
            .Join(_db.Shares, g => g.ShareId, s => s.Id, (g, s) => new { g.Permission, s.ResourceType, s.ResourceId })
            .FirstOrDefaultAsync(x => x.ResourceType == resourceType && x.ResourceId == resourceId);

        return grant?.Permission;
    }

    /// <summary>The shared item's own data, via the exact same ToXxx() mapper its normal owner-
    /// facing endpoint already uses — one dispatch point reused by both the authenticated
    /// "Shared with Me" viewer and the public share endpoint, so there's only one place that ever
    /// needs to know how to turn a (type, id) into a DTO.</summary>
    public async Task<object?> ResolveDataAsync(string resourceType, string resourceId) => resourceType switch
    {
        "TripReport" => (await _db.TripReports.FindAsync(resourceId))?.ToTripReport(),
        "TripDocument" => (await _db.TripDocuments.FindAsync(resourceId))?.ToMeta(),
        "DailyReport" => (await _db.DailyReports.FindAsync(resourceId))?.ToDailyReport(),
        "WeeklyReport" => (await _db.WeeklyReports.FindAsync(resourceId))?.ToWeeklyReport(),
        "Contact" => (await _db.Contacts.FindAsync(resourceId))?.ToContactRecord(),
        "QuickLink" => (await _db.QuickLinks.FindAsync(resourceId))?.ToQuickLink(),
        "Resource" => (await _db.Resources.FindAsync(resourceId))?.ToMeta(),
        _ => null,
    };
}
