using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceDriveMirror : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DriveFileId",
                table: "Resources",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveWebViewLink",
                table: "Resources",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResourceFolderId",
                table: "GoogleDriveConnections",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DriveFileId",
                table: "Resources");

            migrationBuilder.DropColumn(
                name: "DriveWebViewLink",
                table: "Resources");

            migrationBuilder.DropColumn(
                name: "ResourceFolderId",
                table: "GoogleDriveConnections");
        }
    }
}
