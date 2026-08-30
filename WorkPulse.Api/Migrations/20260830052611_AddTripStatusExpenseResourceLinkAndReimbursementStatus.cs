using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTripStatusExpenseResourceLinkAndReimbursementStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "TripReports",
                type: "text",
                nullable: false,
                defaultValue: "Planned");

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "TripDocuments",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "TripDocuments",
                type: "text",
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<string>(
                name: "ReimbursementStatus",
                table: "TripDocuments",
                type: "text",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "ResourceId",
                table: "TripDocuments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "TripReports");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "TripDocuments");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "TripDocuments");

            migrationBuilder.DropColumn(
                name: "ReimbursementStatus",
                table: "TripDocuments");

            migrationBuilder.DropColumn(
                name: "ResourceId",
                table: "TripDocuments");
        }
    }
}
