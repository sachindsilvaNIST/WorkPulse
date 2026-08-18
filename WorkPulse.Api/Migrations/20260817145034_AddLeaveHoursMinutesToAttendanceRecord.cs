using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveHoursMinutesToAttendanceRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LeaveHours",
                table: "AttendanceRecords",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LeaveMinutes",
                table: "AttendanceRecords",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LeaveHours",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "LeaveMinutes",
                table: "AttendanceRecords");
        }
    }
}
