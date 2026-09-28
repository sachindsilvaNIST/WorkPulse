using AspNetCore.Identity.Mongo.Model;

namespace WorkPulse.Api.Data.Entities;

public class AppRole : MongoRole<string>
{
    // MongoRole<TKey> inherits the generic IdentityRole<TKey>, which doesn't auto-assign an id.
    public AppRole() { Id = Guid.NewGuid().ToString(); }
    public AppRole(string name) : base(name) { Id = Guid.NewGuid().ToString(); }
}
