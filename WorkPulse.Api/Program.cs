using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.IdentityModel.Tokens;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

var builder = WebApplication.CreateBuilder(args);

// Database — check DATABASE_URL (Render), then fall back to ConnectionStrings:DefaultConnection
var connStr = Environment.GetEnvironmentVariable("DATABASE_URL")
           ?? builder.Configuration.GetConnectionString("DefaultConnection")
           ?? "";
var usePostgres = false;

if (connStr.StartsWith("postgresql://") || connStr.StartsWith("postgres://"))
{
    // Strip query params not supported by Npgsql (e.g., channel_binding, sslmode)
    var cleanUrl = connStr.Split('?')[0];
    var uri = new Uri(cleanUrl);
    var userInfo = uri.UserInfo.Split(':');
    var port = uri.Port > 0 ? uri.Port : 5432;
    connStr = $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.TrimStart('/')}"
            + $";Username={userInfo[0]};Password={userInfo[1]}"
            + ";SSL Mode=Require;Trust Server Certificate=true";
    usePostgres = true;
}
else if (!string.IsNullOrEmpty(connStr) && connStr.Contains("Host="))
{
    usePostgres = true;
}

if (usePostgres)
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connStr));
}
else
{
    // Local dev: use SQLite (no PostgreSQL needed)
    var sqlitePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WorkPulse", "nist_attendance.db");
    Directory.CreateDirectory(Path.GetDirectoryName(sqlitePath)!);
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite($"Data Source={sqlitePath}"));
}

// Identity
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

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

// Email (2FA login codes) — logs instead of sending when Smtp:Host isn't configured
builder.Services.AddSingleton<WorkPulse.Api.Services.IEmailSender, WorkPulse.Api.Services.SmtpEmailSender>();

// Google Drive (Reimbursement document mirroring) — needs a generic IHttpClientFactory for the
// raw OAuth token-exchange/refresh calls, and AppDbContext (scoped) for connection storage.
builder.Services.AddHttpClient();
builder.Services.AddScoped<WorkPulse.Api.Services.GoogleDriveService>();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:5200" };
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
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

// Auto-migrate on startup and seed roles
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var isSqlite = db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite";

    // On a genuinely empty database (e.g. a fresh Render Postgres instance), AspNetUsers
    // doesn't exist yet — but the raw SQL bootstrap below creates DictionaryEntries/Labels
    // with a foreign key to it. Apply just InitialCreate first so that table exists; this
    // is a no-op (MigrateAsync to an already-applied target) on any database that has run
    // migrations before, so it's safe for existing local/dev databases too.
    if (!(await db.Database.GetAppliedMigrationsAsync()).Any())
    {
        var migrator = db.Database.GetInfrastructure().GetRequiredService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>();
        await migrator.MigrateAsync("20260317022327_InitialCreate");
    }

    // Ensure the Dictionary tables exist BEFORE running the remaining migrations. InitialCreate
    // never actually created DictionaryEntries/DictionaryLabels/DictionaryEntryLabels (they were
    // bolted on later via this raw SQL bootstrap); AddJlptLevelToDictionaryEntry and
    // AddSrsFieldsToDictionaryEntry both ALTER those tables and will fail on a genuinely
    // fresh database if this runs after Migrate() instead of before it.
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = isSqlite
            ? @"
                CREATE TABLE IF NOT EXISTS ""DictionaryEntries"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_DictionaryEntries"" PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" TEXT NOT NULL REFERENCES ""AspNetUsers""(""Id"") ON DELETE CASCADE,
                    ""Japanese"" TEXT NOT NULL,
                    ""Reading"" TEXT NULL,
                    ""Meaning"" TEXT NOT NULL,
                    ""ExampleJp"" TEXT NULL,
                    ""ExampleEn"" TEXT NULL,
                    ""Notes"" TEXT NULL,
                    ""CreatedUtc"" TEXT NOT NULL,
                    ""LastModifiedUtc"" TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ""IX_DictionaryEntries_UserId"" ON ""DictionaryEntries"" (""UserId"");

                CREATE TABLE IF NOT EXISTS ""DictionaryLabels"" (
                    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_DictionaryLabels"" PRIMARY KEY AUTOINCREMENT,
                    ""UserId"" TEXT NOT NULL REFERENCES ""AspNetUsers""(""Id"") ON DELETE CASCADE,
                    ""Name"" TEXT NOT NULL,
                    ""Color"" TEXT NOT NULL DEFAULT '#0078D4',
                    ""CreatedUtc"" TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_DictionaryLabels_UserId_Name"" ON ""DictionaryLabels"" (""UserId"", ""Name"");

                CREATE TABLE IF NOT EXISTS ""DictionaryEntryLabels"" (
                    ""EntryId"" INTEGER NOT NULL REFERENCES ""DictionaryEntries""(""Id"") ON DELETE CASCADE,
                    ""LabelId"" INTEGER NOT NULL REFERENCES ""DictionaryLabels""(""Id"") ON DELETE CASCADE,
                    PRIMARY KEY (""EntryId"", ""LabelId"")
                );
                CREATE INDEX IF NOT EXISTS ""IX_DictionaryEntryLabels_LabelId"" ON ""DictionaryEntryLabels"" (""LabelId"");
            "
            : @"
                CREATE TABLE IF NOT EXISTS ""DictionaryEntries"" (
                    ""Id"" serial PRIMARY KEY,
                    ""UserId"" text NOT NULL REFERENCES ""AspNetUsers""(""Id"") ON DELETE CASCADE,
                    ""Japanese"" text NOT NULL,
                    ""Reading"" text,
                    ""Meaning"" text NOT NULL,
                    ""ExampleJp"" text,
                    ""ExampleEn"" text,
                    ""Notes"" text,
                    ""CreatedUtc"" timestamp with time zone NOT NULL DEFAULT now(),
                    ""LastModifiedUtc"" timestamp with time zone NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS ""IX_DictionaryEntries_UserId"" ON ""DictionaryEntries"" (""UserId"");

                CREATE TABLE IF NOT EXISTS ""DictionaryLabels"" (
                    ""Id"" serial PRIMARY KEY,
                    ""UserId"" text NOT NULL REFERENCES ""AspNetUsers""(""Id"") ON DELETE CASCADE,
                    ""Name"" text NOT NULL,
                    ""Color"" text NOT NULL DEFAULT '#0078D4',
                    ""CreatedUtc"" timestamp with time zone NOT NULL DEFAULT now()
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_DictionaryLabels_UserId_Name"" ON ""DictionaryLabels"" (""UserId"", ""Name"");

                CREATE TABLE IF NOT EXISTS ""DictionaryEntryLabels"" (
                    ""EntryId"" integer NOT NULL REFERENCES ""DictionaryEntries""(""Id"") ON DELETE CASCADE,
                    ""LabelId"" integer NOT NULL REFERENCES ""DictionaryLabels""(""Id"") ON DELETE CASCADE,
                    PRIMARY KEY (""EntryId"", ""LabelId"")
                );
                CREATE INDEX IF NOT EXISTS ""IX_DictionaryEntryLabels_LabelId"" ON ""DictionaryEntryLabels"" (""LabelId"");
            ";
        await cmd.ExecuteNonQueryAsync();
    }

    // Now apply migrations (InitialCreate + all incremental ones) — the Dictionary
    // tables already exist, so AddJlptLevelToDictionaryEntry/AddSrsFieldsToDictionaryEntry
    // can ALTER them successfully even on a brand-new database.
    db.Database.Migrate();

    // Seed Admin role
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

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
            var firstUser = db.Users.OrderBy(u => u.Id).FirstOrDefault();
            if (firstUser != null)
                await userManager.AddToRoleAsync(firstUser, "Admin");
        }
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Serve Blazor WASM static files (production: embedded in wwwroot)
app.UseBlazorFrameworkFiles();
app.UseStaticFiles();

app.MapControllers();

// Fallback to Blazor index.html for client-side routing
app.MapFallbackToFile("index.html");

app.Run();
