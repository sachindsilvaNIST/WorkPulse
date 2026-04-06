using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
    if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
    {
        db.Database.EnsureCreated();
    }
    else
    {
        // Apply pending migrations for existing tables
        db.Database.Migrate();

        // Ensure new tables exist (handles tables added after last migration)
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
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

    // Seed Admin role
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

    // Make the first user an admin if no admins exist
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var admins = await userManager.GetUsersInRoleAsync("Admin");
    if (admins.Count == 0)
    {
        var firstUser = db.Users.OrderBy(u => u.Id).FirstOrDefault();
        if (firstUser != null)
            await userManager.AddToRoleAsync(firstUser, "Admin");
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
