using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public DbSet<AttendanceMonthEntity> AttendanceMonths => Set<AttendanceMonthEntity>();
    public DbSet<AttendanceRecordEntity> AttendanceRecords => Set<AttendanceRecordEntity>();
    public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
    public DbSet<UserSettingsEntity> UserSettings => Set<UserSettingsEntity>();
    public DbSet<DictionaryEntryEntity> DictionaryEntries => Set<DictionaryEntryEntity>();
    public DbSet<DictionaryLabelEntity> DictionaryLabels => Set<DictionaryLabelEntity>();
    public DbSet<DictionaryEntryLabelEntity> DictionaryEntryLabels => Set<DictionaryEntryLabelEntity>();
    public DbSet<QuickLinkEntity> QuickLinks => Set<QuickLinkEntity>();
    public DbSet<DailyReportEntity> DailyReports => Set<DailyReportEntity>();
    public DbSet<WeeklyReportEntity> WeeklyReports => Set<WeeklyReportEntity>();
    public DbSet<TripReportEntity> TripReports => Set<TripReportEntity>();
    public DbSet<TripDocumentEntity> TripDocuments => Set<TripDocumentEntity>();
    public DbSet<UserSessionEntity> UserSessions => Set<UserSessionEntity>();
    public DbSet<ReimbursementCategoryEntity> ReimbursementCategories => Set<ReimbursementCategoryEntity>();
    public DbSet<GoogleDriveConnectionEntity> GoogleDriveConnections => Set<GoogleDriveConnectionEntity>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // AttendanceMonth
        builder.Entity<AttendanceMonthEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Year, x.Month }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany(u => u.AttendanceMonths)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AttendanceRecord
        builder.Entity<AttendanceRecordEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.MonthId, x.Date }).IsUnique();
            e.HasOne(x => x.Month)
                .WithMany(m => m.Records)
                .HasForeignKey(x => x.MonthId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Contact
        builder.Entity<ContactEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.User)
                .WithMany(u => u.Contacts)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserSettings
        builder.Entity<UserSettingsEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId).IsUnique();
            e.HasOne(x => x.User)
                .WithOne(u => u.Settings)
                .HasForeignKey<UserSettingsEntity>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserSession
        builder.Entity<UserSessionEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.RefreshToken).IsUnique();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ReimbursementCategory
        builder.Entity<ReimbursementCategoryEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // GoogleDriveConnection
        builder.Entity<GoogleDriveConnectionEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId).IsUnique();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DictionaryEntry
        builder.Entity<DictionaryEntryEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DictionaryLabel
        builder.Entity<DictionaryLabelEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DictionaryEntryLabel (many-to-many join)
        builder.Entity<DictionaryEntryLabelEntity>(e =>
        {
            e.HasKey(x => new { x.EntryId, x.LabelId });
            e.HasOne(x => x.Entry)
                .WithMany(entry => entry.EntryLabels)
                .HasForeignKey(x => x.EntryId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Label)
                .WithMany(label => label.EntryLabels)
                .HasForeignKey(x => x.LabelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // QuickLink
        builder.Entity<QuickLinkEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DailyReport
        builder.Entity<DailyReportEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.ReportDate });
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // WeeklyReport
        builder.Entity<WeeklyReportEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.WeekStartDate });
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TripReport
        builder.Entity<TripReportEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.UserId, x.StartDate });
            e.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // TripDocument
        builder.Entity<TripDocumentEntity>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TripReportId);
            e.HasIndex(x => x.UserId);
            e.HasOne(x => x.TripReport)
                .WithMany(t => t.Documents)
                .HasForeignKey(x => x.TripReportId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
