using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Data;

// Plain DbContext, not IdentityDbContext<AppUser> — Identity now lives in its own Mongo
// collection via AspNetCore.Identity.Mongo (see AppUser.cs/Program.cs), entirely separate from
// this context's model, since the Mongo EF Core provider doesn't support the Select-projection
// LINQ patterns the stock Identity stores rely on internally.
public class AppDbContext : DbContext
{
    public DbSet<AttendanceMonthEntity> AttendanceMonths => Set<AttendanceMonthEntity>();
    public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
    public DbSet<UserSettingsEntity> UserSettings => Set<UserSettingsEntity>();
    public DbSet<DictionaryEntryEntity> DictionaryEntries => Set<DictionaryEntryEntity>();
    public DbSet<DictionaryLabelEntity> DictionaryLabels => Set<DictionaryLabelEntity>();
    public DbSet<QuickLinkEntity> QuickLinks => Set<QuickLinkEntity>();
    public DbSet<DailyReportEntity> DailyReports => Set<DailyReportEntity>();
    public DbSet<WeeklyReportEntity> WeeklyReports => Set<WeeklyReportEntity>();
    public DbSet<TripReportEntity> TripReports => Set<TripReportEntity>();
    public DbSet<TripDocumentEntity> TripDocuments => Set<TripDocumentEntity>();
    public DbSet<UserSessionEntity> UserSessions => Set<UserSessionEntity>();
    public DbSet<ReimbursementCategoryEntity> ReimbursementCategories => Set<ReimbursementCategoryEntity>();
    public DbSet<GoogleDriveConnectionEntity> GoogleDriveConnections => Set<GoogleDriveConnectionEntity>();
    public DbSet<GmailConnectionEntity> GmailConnections => Set<GmailConnectionEntity>();
    public DbSet<ResourceEntity> Resources => Set<ResourceEntity>();
    public DbSet<NotificationEntity> Notifications => Set<NotificationEntity>();
    public DbSet<ShareEntity> Shares => Set<ShareEntity>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // AttendanceMonth — Records embedded (wholesale-replaced together on every save, same as
        // the app's own AttendanceController.SaveMonth pattern already assumed).
        builder.Entity<AttendanceMonthEntity>(e =>
        {
            e.ToCollection("attendance_months");
            e.HasIndex(x => new { x.UserId, x.Year, x.Month }).IsUnique();
            e.OwnsMany(x => x.Records, r => r.HasElementName("records"));
        });

        builder.Entity<ContactEntity>(e =>
        {
            e.ToCollection("contacts");
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<UserSettingsEntity>(e =>
        {
            e.ToCollection("user_settings");
            e.HasIndex(x => x.UserId).IsUnique();
        });

        // DictionaryEntry — LabelIds replaces the old many-to-many join table (see LabelIds'
        // own doc comment on DictionaryEntryEntity).
        builder.Entity<DictionaryEntryEntity>(e =>
        {
            e.ToCollection("dictionary_entries");
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<DictionaryLabelEntity>(e =>
        {
            e.ToCollection("dictionary_labels");
            e.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
        });

        builder.Entity<QuickLinkEntity>(e =>
        {
            e.ToCollection("quick_links");
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<DailyReportEntity>(e =>
        {
            e.ToCollection("daily_reports");
            e.HasIndex(x => new { x.UserId, x.ReportDate });
        });

        builder.Entity<WeeklyReportEntity>(e =>
        {
            e.ToCollection("weekly_reports");
            e.HasIndex(x => new { x.UserId, x.WeekStartDate });
        });

        // TripReport — Segments/BudgetLines/Settlement (and Settlement's own
        // TransportationLines/OtherLines, nested one level further) are all embedded; Documents
        // stays a separate top-level collection (see TripReportEntity's doc comment for why).
        builder.Entity<TripReportEntity>(e =>
        {
            e.ToCollection("trip_reports");
            e.HasIndex(x => new { x.UserId, x.StartDate });
            e.OwnsMany(x => x.Segments, s => s.HasElementName("segments"));
            e.OwnsMany(x => x.BudgetLines, b => b.HasElementName("budgetLines"));
            e.OwnsOne(x => x.Settlement, s =>
            {
                s.HasElementName("settlement");
                s.OwnsMany(x => x.TransportationLines, t => t.HasElementName("transportationLines"));
                s.OwnsMany(x => x.OtherLines, o => o.HasElementName("otherLines"));
            });
        });

        builder.Entity<TripDocumentEntity>(e =>
        {
            e.ToCollection("trip_documents");
            e.HasIndex(x => x.TripReportId);
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<UserSessionEntity>(e =>
        {
            e.ToCollection("user_sessions");
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.RefreshToken).IsUnique();
        });

        builder.Entity<ReimbursementCategoryEntity>(e =>
        {
            e.ToCollection("reimbursement_categories");
            e.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
        });

        builder.Entity<GoogleDriveConnectionEntity>(e =>
        {
            e.ToCollection("google_drive_connections");
            e.HasIndex(x => x.UserId).IsUnique();
        });

        // GmailConnection — Labels embedded (1:1 connection per user, full-refresh sync pattern).
        builder.Entity<GmailConnectionEntity>(e =>
        {
            e.ToCollection("gmail_connections");
            e.HasIndex(x => x.UserId).IsUnique();
            e.OwnsMany(x => x.Labels, l => l.HasElementName("labels"));
        });

        builder.Entity<ResourceEntity>(e =>
        {
            e.ToCollection("resources");
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<NotificationEntity>(e =>
        {
            e.ToCollection("notifications");
            e.HasIndex(x => new { x.UserId, x.DedupeKey }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.CreatedUtc });
        });

        // Share — Grants embedded (wholesale-replaced together, same as SharesController's save
        // pattern already assumed). ResourceType/ResourceId stays a loose string pointer, same as
        // today — Mongo has no FK support either, so nothing is lost.
        builder.Entity<ShareEntity>(e =>
        {
            e.ToCollection("shares");
            e.HasIndex(x => new { x.ResourceType, x.ResourceId, x.OwnerUserId }).IsUnique();
            e.HasIndex(x => x.PublicToken).IsUnique();
            e.OwnsMany(x => x.Grants, g => g.HasElementName("grants"));
        });
    }
}
