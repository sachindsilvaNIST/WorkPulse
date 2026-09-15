using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomSettlementPeriod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "CustomSettlementEnd",
                table: "AttendanceMonths",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "CustomSettlementStart",
                table: "AttendanceMonths",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomSettlementEnd",
                table: "AttendanceMonths");

            migrationBuilder.DropColumn(
                name: "CustomSettlementStart",
                table: "AttendanceMonths");
        }
    }
}
