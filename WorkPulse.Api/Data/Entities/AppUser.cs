using AspNetCore.Identity.Mongo.Model;

namespace WorkPulse.Api.Data.Entities;

// Identity now lives entirely in its own Mongo collection via AspNetCore.Identity.Mongo's native
// driver stores (see Program.cs's AddIdentityMongoDbProvider call) — deliberately NOT routed
// through the main MongoDB.EntityFrameworkCore AppDbContext, since the EF Mongo provider doesn't
// support the Select-projection LINQ patterns the stock Identity UserStore/RoleStore rely on
// internally. That's also why this no longer carries EF navigation collections (AttendanceMonths,
// Contacts, Settings) — those live in AppDbContext's own model now, referenced only by UserId.
public class AppUser : MongoUser<string>
{
    // MongoUser<TKey> inherits the generic IdentityUser<TKey>, not the string-specialized
    // IdentityUser class that auto-assigns a new Guid — so this needs to do it explicitly.
    public AppUser() { Id = Guid.NewGuid().ToString(); }

    public string DisplayName { get; set; } = "";
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryUtc { get; set; }

    /// <summary>
    /// Comma-separated list of feature keys disabled for this user (e.g. "dictionary,calendar").
    /// Null/empty = all features enabled.
    /// </summary>
    public string? DisabledFeaturesCsv { get; set; }
}
