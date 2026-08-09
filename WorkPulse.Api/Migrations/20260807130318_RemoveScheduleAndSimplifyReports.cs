using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveScheduleAndSimplifyReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScheduleEvents");

            migrationBuilder.DropColumn(
                name: "Achievements",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Issues",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "NextSteps",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Achievements",
                table: "DailyReports");

            migrationBuilder.DropColumn(
                name: "Issues",
                table: "DailyReports");

            migrationBuilder.DropColumn(
                name: "NextSteps",
                table: "DailyReports");

            migrationBuilder.RenameColumn(
                name: "Summary",
                table: "WeeklyReports",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "Summary",
                table: "DailyReports",
                newName: "Title");

            migrationBuilder.AddColumn<string>(
                name: "Body",
                table: "WeeklyReports",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Body",
                table: "DailyReports",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Body",
                table: "WeeklyReports");

            migrationBuilder.DropColumn(
                name: "Body",
                table: "DailyReports");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "WeeklyReports",
                newName: "Summary");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "DailyReports",
                newName: "Summary");

            migrationBuilder.AddColumn<string>(
                name: "Achievements",
                table: "WeeklyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Issues",
                table: "WeeklyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextSteps",
                table: "WeeklyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Achievements",
                table: "DailyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Issues",
                table: "DailyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextSteps",
                table: "DailyReports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ScheduleEvents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    AllDay = table.Column<bool>(type: "INTEGER", nullable: false),
                    ColorHex = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    EndTime = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    EventDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    LastModifiedUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: true),
                    StartTime = table.Column<TimeOnly>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduleEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScheduleEvents_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScheduleEvents_UserId_EventDate",
                table: "ScheduleEvents",
                columns: new[] { "UserId", "EventDate" });
        }
    }
}
