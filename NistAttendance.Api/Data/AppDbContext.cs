using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NistAttendance.Api.Data.Entities;

namespace NistAttendance.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public DbSet<AttendanceMonthEntity> AttendanceMonths => Set<AttendanceMonthEntity>();
    public DbSet<AttendanceRecordEntity> AttendanceRecords => Set<AttendanceRecordEntity>();
    public DbSet<ContactEntity> Contacts => Set<ContactEntity>();
    public DbSet<UserSettingsEntity> UserSettings => Set<UserSettingsEntity>();

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
    }
}
