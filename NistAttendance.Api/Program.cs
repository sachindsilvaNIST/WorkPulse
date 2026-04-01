using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NistAttendance.Api.Data;
using NistAttendance.Api.Data.Entities;

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
        "NistAttendance", "nist_attendance.db");
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
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "NistAttendanceApi",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "NistAttendanceApp",
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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.Sqlite")
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();
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
