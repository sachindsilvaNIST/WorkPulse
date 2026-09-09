using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSharing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Shares",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    OwnerUserId = table.Column<string>(type: "text", nullable: false),
                    ResourceType = table.Column<string>(type: "text", nullable: false),
                    ResourceId = table.Column<string>(type: "text", nullable: false),
                    IsPublic = table.Column<bool>(type: "boolean", nullable: false),
                    PublicPermission = table.Column<string>(type: "text", nullable: false),
                    PublicToken = table.Column<string>(type: "text", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shares_AspNetUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShareGrants",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ShareId = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Permission = table.Column<string>(type: "text", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareGrants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShareGrants_Shares_ShareId",
                        column: x => x.ShareId,
                        principalTable: "Shares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShareGrants_Email",
                table: "ShareGrants",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_ShareGrants_ShareId",
                table: "ShareGrants",
                column: "ShareId");

            migrationBuilder.CreateIndex(
                name: "IX_Shares_OwnerUserId",
                table: "Shares",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Shares_PublicToken",
                table: "Shares",
                column: "PublicToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Shares_ResourceType_ResourceId_OwnerUserId",
                table: "Shares",
                columns: new[] { "ResourceType", "ResourceId", "OwnerUserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShareGrants");

            migrationBuilder.DropTable(
                name: "Shares");
        }
    }
}
