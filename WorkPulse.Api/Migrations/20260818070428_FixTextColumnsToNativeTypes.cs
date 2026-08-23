using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    // A handful of columns across DailyReports, WeeklyReports, TripReports, TripDocuments,
    // QuickLinks and DictionaryEntries were created as "text" by migrations authored while the
    // design-time tooling was resolving to the SQLite provider — despite the C# models expecting
    // DateOnly/DateTime and Postgres running in production. EF's change-detection can't see this
    // drift (its own snapshot already "believes" the columns are the target type), so these
    // AlterColumn calls are hand-written with explicit USING casts rather than scaffolded.
    public partial class FixTextColumnsToNativeTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""DailyReports"" ALTER COLUMN ""ReportDate"" TYPE date USING ""ReportDate""::date;");
            migrationBuilder.Sql(@"ALTER TABLE ""DailyReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE timestamp with time zone USING ""LastModifiedUtc""::timestamp with time zone;");

            migrationBuilder.Sql(@"ALTER TABLE ""WeeklyReports"" ALTER COLUMN ""WeekStartDate"" TYPE date USING ""WeekStartDate""::date;");
            migrationBuilder.Sql(@"ALTER TABLE ""WeeklyReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE timestamp with time zone USING ""LastModifiedUtc""::timestamp with time zone;");

            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""StartDate"" TYPE date USING ""StartDate""::date;");
            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""EndDate"" TYPE date USING ""EndDate""::date;");
            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE timestamp with time zone USING ""LastModifiedUtc""::timestamp with time zone;");

            migrationBuilder.Sql(@"ALTER TABLE ""TripDocuments"" ALTER COLUMN ""UploadedUtc"" TYPE timestamp with time zone USING ""UploadedUtc""::timestamp with time zone;");

            migrationBuilder.Sql(@"ALTER TABLE ""QuickLinks"" ALTER COLUMN ""LastModifiedUtc"" TYPE timestamp with time zone USING ""LastModifiedUtc""::timestamp with time zone;");

            migrationBuilder.Sql(@"ALTER TABLE ""DictionaryEntries"" ALTER COLUMN ""SrsNextReviewUtc"" TYPE timestamp with time zone USING ""SrsNextReviewUtc""::timestamp with time zone;");
            migrationBuilder.Sql(@"ALTER TABLE ""DictionaryEntries"" ALTER COLUMN ""SrsLastReviewUtc"" TYPE timestamp with time zone USING ""SrsLastReviewUtc""::timestamp with time zone;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""DailyReports"" ALTER COLUMN ""ReportDate"" TYPE text USING ""ReportDate""::text;");
            migrationBuilder.Sql(@"ALTER TABLE ""DailyReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE text USING ""LastModifiedUtc""::text;");

            migrationBuilder.Sql(@"ALTER TABLE ""WeeklyReports"" ALTER COLUMN ""WeekStartDate"" TYPE text USING ""WeekStartDate""::text;");
            migrationBuilder.Sql(@"ALTER TABLE ""WeeklyReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE text USING ""LastModifiedUtc""::text;");

            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""StartDate"" TYPE text USING ""StartDate""::text;");
            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""EndDate"" TYPE text USING ""EndDate""::text;");
            migrationBuilder.Sql(@"ALTER TABLE ""TripReports"" ALTER COLUMN ""LastModifiedUtc"" TYPE text USING ""LastModifiedUtc""::text;");

            migrationBuilder.Sql(@"ALTER TABLE ""TripDocuments"" ALTER COLUMN ""UploadedUtc"" TYPE text USING ""UploadedUtc""::text;");

            migrationBuilder.Sql(@"ALTER TABLE ""QuickLinks"" ALTER COLUMN ""LastModifiedUtc"" TYPE text USING ""LastModifiedUtc""::text;");

            migrationBuilder.Sql(@"ALTER TABLE ""DictionaryEntries"" ALTER COLUMN ""SrsNextReviewUtc"" TYPE text USING ""SrsNextReviewUtc""::text;");
            migrationBuilder.Sql(@"ALTER TABLE ""DictionaryEntries"" ALTER COLUMN ""SrsLastReviewUtc"" TYPE text USING ""SrsLastReviewUtc""::text;");
        }
    }
}
