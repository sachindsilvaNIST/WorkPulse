using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WorkPulse.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOrphanedUnconfirmedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Registration was briefly writing a real (unconfirmed) AspNetUsers row before this
            // migration's app-code companion changed it to hold the pending signup in memory
            // instead — any row still sitting at EmailConfirmed = false is a leftover from that
            // window (an abandoned/failed attempt) and can never legitimately exist going forward,
            // so it's safe to remove outright rather than leave it permanently squatting on that
            // email address.
            migrationBuilder.Sql(@"DELETE FROM ""AspNetUsers"" WHERE ""EmailConfirmed"" = false;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Not reversible — the deleted rows are gone.
        }
    }
}
