using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationChannel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NotificationChannel",
                table: "UserSettings",
                type: "text",
                nullable: false,
                defaultValue: "Email");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotificationChannel",
                table: "UserSettings");
        }
    }
}
