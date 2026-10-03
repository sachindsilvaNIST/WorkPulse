using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using MongoDB.Driver.GridFS;
using WorkPulse.Api.Data;

namespace WorkPulse.Api.Services;

/// <summary>
/// Deletes everything a user owns, across every collection — the Mongo-era replacement for what
/// Postgres's ON DELETE CASCADE used to do automatically for every table with a UserId foreign
/// key. Mongo has no cascade-delete, so this has to be explicit and complete: call it BEFORE
/// deleting the Identity user itself (AuthController.DeleteAccount, AdminController.DeleteUser),
/// since it's this collection-by-collection cleanup, not the Identity delete, that actually
/// removes the user's data.
/// </summary>
public class UserAccountService
{
    private readonly AppDbContext _db;
    private readonly GridFSBucket _gridFs;
    private readonly ILogger<UserAccountService> _logger;

    public UserAccountService(AppDbContext db, GridFSBucket gridFs, ILogger<UserAccountService> logger)
    {
        _db = db;
        _gridFs = gridFs;
        _logger = logger;
    }

    public async Task PurgeAllUserDataAsync(string userId)
    {
        // Resources and TripDocuments own GridFS blobs — delete those first, best-effort (a
        // missing/already-gone blob shouldn't block the rest of the purge).
        var resources = await _db.Resources.Where(r => r.UserId == userId).ToListAsync();
        foreach (var r in resources.Where(r => r.ContentGridFsId != null))
        {
            try { await _gridFs.DeleteAsync(ObjectId.Parse(r.ContentGridFsId!)); }
            catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for resource {ResourceId}", r.Id); }
        }

        var tripDocs = await _db.TripDocuments.Where(d => d.UserId == userId).ToListAsync();
        foreach (var d in tripDocs.Where(d => d.ContentGridFsId != null))
        {
            try { await _gridFs.DeleteAsync(ObjectId.Parse(d.ContentGridFsId!)); }
            catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for document {DocId}", d.Id); }
        }

        var utilityDocs = await _db.UtilityBillDocuments.Where(d => d.UserId == userId).ToListAsync();
        foreach (var d in utilityDocs.Where(d => d.ContentGridFsId != null))
        {
            try { await _gridFs.DeleteAsync(ObjectId.Parse(d.ContentGridFsId!)); }
            catch (Exception ex) { _logger.LogWarning(ex, "GridFS delete failed for utility bill document {DocId}", d.Id); }
        }

        _db.Resources.RemoveRange(resources);
        _db.TripDocuments.RemoveRange(tripDocs);
        _db.UtilityBillDocuments.RemoveRange(utilityDocs);
        _db.UtilityBills.RemoveRange(await _db.UtilityBills.Where(x => x.UserId == userId).ToListAsync());
        _db.UtilityProviderSettings.RemoveRange(await _db.UtilityProviderSettings.Where(x => x.UserId == userId).ToListAsync());
        _db.AttendanceMonths.RemoveRange(await _db.AttendanceMonths.Where(x => x.UserId == userId).ToListAsync());
        _db.Contacts.RemoveRange(await _db.Contacts.Where(x => x.UserId == userId).ToListAsync());
        _db.UserSettings.RemoveRange(await _db.UserSettings.Where(x => x.UserId == userId).ToListAsync());
        _db.DictionaryEntries.RemoveRange(await _db.DictionaryEntries.Where(x => x.UserId == userId).ToListAsync());
        _db.DictionaryLabels.RemoveRange(await _db.DictionaryLabels.Where(x => x.UserId == userId).ToListAsync());
        _db.QuickLinks.RemoveRange(await _db.QuickLinks.Where(x => x.UserId == userId).ToListAsync());
        _db.DailyReports.RemoveRange(await _db.DailyReports.Where(x => x.UserId == userId).ToListAsync());
        _db.WeeklyReports.RemoveRange(await _db.WeeklyReports.Where(x => x.UserId == userId).ToListAsync());
        _db.TripReports.RemoveRange(await _db.TripReports.Where(x => x.UserId == userId).ToListAsync());
        _db.UserSessions.RemoveRange(await _db.UserSessions.Where(x => x.UserId == userId).ToListAsync());
        _db.ReimbursementCategories.RemoveRange(await _db.ReimbursementCategories.Where(x => x.UserId == userId).ToListAsync());
        _db.GoogleDriveConnections.RemoveRange(await _db.GoogleDriveConnections.Where(x => x.UserId == userId).ToListAsync());
        _db.GmailConnections.RemoveRange(await _db.GmailConnections.Where(x => x.UserId == userId).ToListAsync());
        _db.Notifications.RemoveRange(await _db.Notifications.Where(x => x.UserId == userId).ToListAsync());
        _db.Shares.RemoveRange(await _db.Shares.Where(x => x.OwnerUserId == userId).ToListAsync());

        await _db.SaveChangesAsync();
    }
}
