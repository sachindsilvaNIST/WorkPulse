using System.Text;
using AspNetCore.Identity.Mongo;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using MongoDB.EntityFrameworkCore.Extensions;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

var builder = WebApplication.CreateBuilder(args);

// No-op outside a real Lambda runtime (e.g. `dotnet run` locally, or the old Render container),
// so this is purely additive — it only takes over request handling when actually invoked via a
// Lambda Function URL.
builder.Services.AddAWSLambdaHosting(Microsoft.Extensions.DependencyInjection.LambdaEventSource.HttpApi);

// Database — MongoDB Atlas. MONGO_CONNECTION_STRING/MONGO_DATABASE_NAME env vars in production
// (Lambda), Mongo:ConnectionString/Mongo:DatabaseName in appsettings/user-secrets for local dev —
// same two-tier lookup shape the old Postgres DATABASE_URL/ConnectionStrings fallback used.
var mongoConnStr = Environment.GetEnvironmentVariable("MONGO_CONNECTION_STRING")
                 ?? builder.Configuration["Mongo:ConnectionString"]
                 ?? throw new InvalidOperationException("Mongo connection string not configured. Set MONGO_CONNECTION_STRING or Mongo:ConnectionString.");
var mongoDbName = Environment.GetEnvironmentVariable("MONGO_DATABASE_NAME")
                ?? builder.Configuration["Mongo:DatabaseName"]
                ?? "workpulse";

// AspNetCore.Identity.Mongo's MongoIdentityOptions.ConnectionString wants the database name
// embedded in the URI path (e.g. ".../?params" -> ".../workpulse?params"), same shape as its own
// default "mongodb://localhost/default" — insert it before the query string, not just appended,
// or it silently becomes part of the query string instead of the path.
var mongoConnStrWithDb = mongoConnStr.Contains('?')
    ? (mongoConnStr[..mongoConnStr.IndexOf('?')].TrimEnd('/') + $"/{mongoDbName}" + mongoConnStr[mongoConnStr.IndexOf('?')..])
    : $"{mongoConnStr.TrimEnd('/')}/{mongoDbName}";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMongoDB(mongoConnStr, mongoDbName));

// GridFS for file uploads (Resources, TripDocuments) — Mongo documents cap out at 16MB, and
// uploads here can be up to 50MB, so file bytes live in GridFS instead of an inline field.
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoConnStr));
builder.Services.AddSingleton(sp =>
    new GridFSBucket(sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDbName)));

// Identity — deliberately NOT routed through the MongoDB.EntityFrameworkCore AppDbContext above;
// see AppUser.cs's doc comment for why. AddIdentityMongoDbProvider talks to Mongo directly via
// the native driver, the same relationship SQL Server's original Identity store had to ADO.NET.
builder.Services.AddIdentityMongoDbProvider<AppUser, AppRole, string>(
    identityOptions =>
    {
        identityOptions.Password.RequireDigit = false;
        identityOptions.Password.RequireLowercase = false;
        identityOptions.Password.RequireUppercase = false;
        identityOptions.Password.RequireNonAlphanumeric = false;
        identityOptions.Password.RequiredLength = 6;
    },
    mongoOptions =>
    {
        mongoOptions.ConnectionString = mongoConnStrWithDb;
    });

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT secret not configured. Set Jwt:Secret in appsettings or environment.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "WorkPulseApi",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "WorkPulseApp",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

// Anthropic API client for AI features
builder.Services.AddHttpClient<WorkPulse.Api.Services.AnthropicService>();

// Email (2FA/confirmation codes) via Resend's HTTP API — logs instead of sending when
// Resend:ApiKey isn't configured. Not SMTP: Render's free tier blocks outbound SMTP ports
// entirely, confirmed via a live SocketException, so an HTTP-based sender is required here.
builder.Services.AddSingleton<WorkPulse.Api.Services.IEmailSender, WorkPulse.Api.Services.ResendEmailSender>();

// Holds pending (not-yet-confirmed) registrations in-process — AuthController.Register never
// writes to AspNetUsers until the emailed code is actually verified.
builder.Services.AddMemoryCache();

// Google Drive (Reimbursement document mirroring) — needs a generic IHttpClientFactory for the
// raw OAuth token-exchange/refresh calls, and AppDbContext (scoped) for connection storage.
builder.Services.AddHttpClient();
builder.Services.AddScoped<WorkPulse.Api.Services.GoogleDriveService>();

// Gmail (corporate label manager) — separate connection/scope from Drive above.
builder.Services.AddScoped<WorkPulse.Api.Services.GmailService>();

// In-app + email notifications (daily report reminders, upcoming trips) — triggered externally
// every 30 minutes via POST /api/internal/run-scheduler (an AWS EventBridge Scheduler cron hits
// this) rather than an in-process BackgroundService loop, since Lambda has no persistent process
// between invocations to run one on.
builder.Services.AddScoped<WorkPulse.Api.Services.NotificationTriggerService>();

// Sharing (Trips, Reimbursement, Reports, Contacts, Bookmarks, Resources) — one service every
// entity controller's read/update endpoints fall back to once ownership fails.
builder.Services.AddScoped<WorkPulse.Api.Services.ShareAccessService>();

// Account deletion — Mongo has no cascade-delete, so this explicitly purges every collection a
// user owns before the Identity user itself is deleted (AuthController/AdminController).
builder.Services.AddScoped<WorkPulse.Api.Services.UserAccountService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:5200" };
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            // Browsers hide every response header from JS on a cross-origin fetch except a
            // small "simple" allowlist — Content-Disposition isn't in it, so without this the
            // frontend's blob-download helper can never read the real filename the server sent
            // and silently falls back to "download" for every file export/download in the app.
            .WithExposedHeaders("Content-Disposition");
    });
});

// Rate limiting for unauthenticated auth endpoints (register/login/verify-2fa/refresh) — these
// are the only endpoints a public internet visitor can hit repeatedly without a valid token,
// so they're the brute-force/spam surface worth throttling per client IP.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new WorkPulse.Converters.DateOnlyJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new WorkPulse.Converters.TimeOnlyJsonConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate on startup and seed roles. On Lambda this whole block re-runs on every cold
// start (a fresh execution environment each time, not once per deploy) — if the database is
// unreachable (a real outage: quota exhausted, network blip, etc.) and this throws unhandled,
// it takes the ENTIRE Lambda init down with it, including endpoints that don't touch the
// database at all (e.g. /api/health). Catching here means a DB outage degrades gracefully —
// health checks and any non-DB code paths keep working, and DB-touching endpoints fail
// individually per-request with their own real error instead of the whole function refusing
// to boot.
try
{
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Mongo collections are created implicitly on first write, and indexes are declared via
    // HasIndex(...) in AppDbContext.OnModelCreating — this replaces the old Migrate() call
    // (MongoDB.EntityFrameworkCore doesn't support EF migrations, Mongo has no schema/DDL).
    db.Database.EnsureCreated();

    // Seed Admin role
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<AppRole>>();
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new AppRole("Admin"));

    // Promote the designated owner email to Admin if they exist (idempotent).
    // Falls back to "first user" if the owner email isn't registered yet.
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    const string ownerEmail = "sachinronson16@gmail.com";
    var owner = await userManager.FindByEmailAsync(ownerEmail);
    if (owner != null && !await userManager.IsInRoleAsync(owner, "Admin"))
    {
        await userManager.AddToRoleAsync(owner, "Admin");
    }
    else if (owner == null)
    {
        var admins = await userManager.GetUsersInRoleAsync("Admin");
        if (admins.Count == 0)
        {
            var firstUser = userManager.Users.OrderBy(u => u.Id).FirstOrDefault();
            if (firstUser != null)
                await userManager.AddToRoleAsync(firstUser, "Admin");
        }
    }
}
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Startup migration/seed failed — continuing to boot anyway so non-database endpoints (e.g. /api/health) stay reachable during an outage.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Unauthenticated, DB-free — just proves the process is awake. Used by the frontend to fire a
// warm-up ping the moment the app loads, so the free-tier cold start happens in the background
// instead of blocking the first real data request.
app.MapGet("/api/health", () => Results.Ok());

app.MapControllers();

app.Run();
