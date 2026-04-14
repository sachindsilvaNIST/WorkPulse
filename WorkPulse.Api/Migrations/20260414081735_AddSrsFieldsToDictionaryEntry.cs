using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSrsFieldsToDictionaryEntry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "SrsEaseFactor",
                table: "DictionaryEntries",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "SrsIntervalDays",
                table: "DictionaryEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SrsLastReviewUtc",
                table: "DictionaryEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SrsNextReviewUtc",
                table: "DictionaryEntries",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SrsRepetitions",
                table: "DictionaryEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SrsReviewCount",
                table: "DictionaryEntries",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SrsEaseFactor",
                table: "DictionaryEntries");

            migrationBuilder.DropColumn(
                name: "SrsIntervalDays",
                table: "DictionaryEntries");

            migrationBuilder.DropColumn(
                name: "SrsLastReviewUtc",
                table: "DictionaryEntries");

            migrationBuilder.DropColumn(
                name: "SrsNextReviewUtc",
                table: "DictionaryEntries");

            migrationBuilder.DropColumn(
                name: "SrsRepetitions",
                table: "DictionaryEntries");

            migrationBuilder.DropColumn(
                name: "SrsReviewCount",
                table: "DictionaryEntries");
        }
    }
}
