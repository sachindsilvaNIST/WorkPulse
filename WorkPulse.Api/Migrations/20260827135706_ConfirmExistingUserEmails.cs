using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmExistingUserEmails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Login now requires EmailConfirmed = true (new: registration/login email-verification
            // flow). Every account created before this migration predates that requirement and was
            // never asked to verify anything — grandfather them all in so no existing user gets
            // locked out. Only NEW registrations from here on go through the verification code.
            migrationBuilder.Sql(@"UPDATE ""AspNetUsers"" SET ""EmailConfirmed"" = true WHERE ""EmailConfirmed"" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Not reversible — we don't know which rows were already true vs. flipped by Up().
        }
    }
}
