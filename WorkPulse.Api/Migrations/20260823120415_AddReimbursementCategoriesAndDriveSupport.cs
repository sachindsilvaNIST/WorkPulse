using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReimbursementCategoriesAndDriveSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DocumentDate",
                table: "TripDocuments",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveFileId",
                table: "TripDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriveWebViewLink",
                table: "TripDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GoogleDriveConnections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RefreshToken = table.Column<string>(type: "text", nullable: false),
                    AccessToken = table.Column<string>(type: "text", nullable: true),
                    AccessTokenExpiryUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DriveFolderId = table.Column<string>(type: "text", nullable: true),
                    ConnectedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GoogleDriveConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GoogleDriveConnections_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReimbursementCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReimbursementCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReimbursementCategories_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GoogleDriveConnections_UserId",
                table: "GoogleDriveConnections",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReimbursementCategories_UserId_Name",
                table: "ReimbursementCategories",
                columns: new[] { "UserId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GoogleDriveConnections");

            migrationBuilder.DropTable(
                name: "ReimbursementCategories");

            migrationBuilder.DropColumn(
                name: "DocumentDate",
                table: "TripDocuments");

            migrationBuilder.DropColumn(
                name: "DriveFileId",
                table: "TripDocuments");

            migrationBuilder.DropColumn(
                name: "DriveWebViewLink",
                table: "TripDocuments");
        }
    }
}
