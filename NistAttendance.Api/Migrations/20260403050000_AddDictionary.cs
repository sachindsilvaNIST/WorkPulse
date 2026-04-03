using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace NistAttendance.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDictionary : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DictionaryEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Japanese = table.Column<string>(type: "text", nullable: false),
                    Reading = table.Column<string>(type: "text", nullable: true),
                    Meaning = table.Column<string>(type: "text", nullable: false),
                    ExampleJp = table.Column<string>(type: "text", nullable: true),
                    ExampleEn = table.Column<string>(type: "text", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastModifiedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DictionaryEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DictionaryEntries_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DictionaryLabels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Color = table.Column<string>(type: "text", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DictionaryLabels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DictionaryLabels_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DictionaryEntryLabels",
                columns: table => new
                {
                    EntryId = table.Column<int>(type: "integer", nullable: false),
                    LabelId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DictionaryEntryLabels", x => new { x.EntryId, x.LabelId });
                    table.ForeignKey(
                        name: "FK_DictionaryEntryLabels_DictionaryEntries_EntryId",
                        column: x => x.EntryId,
                        principalTable: "DictionaryEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DictionaryEntryLabels_DictionaryLabels_LabelId",
                        column: x => x.LabelId,
                        principalTable: "DictionaryLabels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DictionaryEntries_UserId",
                table: "DictionaryEntries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DictionaryEntryLabels_LabelId",
                table: "DictionaryEntryLabels",
                column: "LabelId");

            migrationBuilder.CreateIndex(
                name: "IX_DictionaryLabels_UserId_Name",
                table: "DictionaryLabels",
                columns: new[] { "UserId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "DictionaryEntryLabels");
            migrationBuilder.DropTable(name: "DictionaryEntries");
            migrationBuilder.DropTable(name: "DictionaryLabels");
        }
    }
}
