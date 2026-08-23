using System.Text.Json;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using DriveFile = Google.Apis.Drive.v3.Data.File;

namespace WorkPulse.Api.Services;

public class GoogleDriveService
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string DriveFileScope = "https://www.googleapis.com/auth/drive.file";
    private const string FolderName = "WorkPulse Reimbursements";
    private const string FolderMimeType = "application/vnd.google-apps.folder";

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GoogleDriveService> _logger;

    public GoogleDriveService(AppDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<GoogleDriveService> logger)
    {
        _db = db;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private string ClientId => _config["Google:ClientId"] ?? "";
    private string ClientSecret => _config["Google:ClientSecret"] ?? "";
    private string RedirectUri => _config["Google:RedirectUri"] ?? "http://localhost:5050/api/googledrive/callback";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret);

    /// <summary>Builds the URL the browser is sent to for the Google consent screen.
    /// `access_type=offline` + `prompt=consent` are both required to reliably get a refresh
    /// token back — Google only issues one on the FIRST consent otherwise, so a user who
    /// disconnects and reconnects would silently stop getting one without `prompt=consent`.</summary>
    public string GetAuthorizationUrl(string state)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = ClientId,
            ["redirect_uri"] = RedirectUri,
            ["response_type"] = "code",
            ["scope"] = DriveFileScope,
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["state"] = state,
        };
        var qs = string.Join("&", query.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        return $"{AuthEndpoint}?{qs}";
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresInSeconds)> ExchangeCodeAsync(string code)
    {
        var client = _httpClientFactory.CreateClient();
        var form = new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = ClientId,
            ["client_secret"] = ClientSecret,
            ["redirect_uri"] = RedirectUri,
            ["grant_type"] = "authorization_code",
        };
        var res = await client.PostAsync(TokenEndpoint, new FormUrlEncodedContent(form));
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Google token exchange failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var accessToken = root.GetProperty("access_token").GetString()!;
        var refreshToken = root.TryGetProperty("refresh_token", out var rt) ? rt.GetString() ?? "" : "";
        var expiresIn = root.GetProperty("expires_in").GetInt32();
        return (accessToken, refreshToken, expiresIn);
    }

    private async Task<(string AccessToken, int ExpiresInSeconds)> RefreshAccessTokenAsync(string refreshToken)
    {
        var client = _httpClientFactory.CreateClient();
        var form = new Dictionary<string, string>
        {
            ["refresh_token"] = refreshToken,
            ["client_id"] = ClientId,
            ["client_secret"] = ClientSecret,
            ["grant_type"] = "refresh_token",
        };
        var res = await client.PostAsync(TokenEndpoint, new FormUrlEncodedContent(form));
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Google token refresh failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        return (root.GetProperty("access_token").GetString()!, root.GetProperty("expires_in").GetInt32());
    }

    /// <summary>Returns a connection with a guaranteed-fresh access token, refreshing and
    /// persisting it first if needed. Null if the user hasn't connected Drive.</summary>
    private async Task<GoogleDriveConnectionEntity?> GetValidConnectionAsync(string userId)
    {
        var conn = await _db.GoogleDriveConnections.FirstOrDefaultAsync(c => c.UserId == userId);
        if (conn == null) return null;

        // 60s safety margin so a token that's about to expire mid-request still gets refreshed.
        if (conn.AccessToken == null || conn.AccessTokenExpiryUtc == null || conn.AccessTokenExpiryUtc < DateTime.UtcNow.AddSeconds(60))
        {
            var (accessToken, expiresIn) = await RefreshAccessTokenAsync(conn.RefreshToken);
            conn.AccessToken = accessToken;
            conn.AccessTokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
            await _db.SaveChangesAsync();
        }

        return conn;
    }

    private static DriveService BuildDriveClient(string accessToken) =>
        new(new BaseClientService.Initializer
        {
            HttpClientInitializer = GoogleCredential.FromAccessToken(accessToken),
            ApplicationName = "WorkPulse",
        });

    private async Task<string> EnsureFolderAsync(DriveService service, GoogleDriveConnectionEntity conn)
    {
        if (!string.IsNullOrEmpty(conn.DriveFolderId)) return conn.DriveFolderId;

        var listRequest = service.Files.List();
        listRequest.Q = $"mimeType='{FolderMimeType}' and name='{FolderName}' and trashed=false";
        listRequest.Fields = "files(id)";
        var existing = await listRequest.ExecuteAsync();
        var folderId = existing.Files.FirstOrDefault()?.Id;

        if (folderId == null)
        {
            var folder = new DriveFile { Name = FolderName, MimeType = FolderMimeType };
            var created = await service.Files.Create(folder).ExecuteAsync();
            folderId = created.Id;
        }

        conn.DriveFolderId = folderId;
        await _db.SaveChangesAsync();
        return folderId;
    }

    /// <summary>Best-effort mirror upload — returns null (not throws) if Drive isn't connected,
    /// so callers whose primary storage is already the local DB copy can treat this as optional.</summary>
    public async Task<(string FileId, string? WebViewLink)?> TryUploadAsync(string userId, string fileName, string contentType, byte[] bytes)
    {
        var conn = await GetValidConnectionAsync(userId);
        if (conn == null) return null;

        var service = BuildDriveClient(conn.AccessToken!);
        var folderId = await EnsureFolderAsync(service, conn);

        var fileMetadata = new DriveFile { Name = fileName, Parents = new List<string> { folderId } };
        using var stream = new MemoryStream(bytes);
        var request = service.Files.Create(fileMetadata, stream, contentType);
        request.Fields = "id, webViewLink";
        var progress = await request.UploadAsync();
        if (progress.Status != Google.Apis.Upload.UploadStatus.Completed)
        {
            _logger.LogWarning("Drive upload for {FileName} ended with status {Status}: {Exception}", fileName, progress.Status, progress.Exception);
            return null;
        }

        return (request.ResponseBody.Id, request.ResponseBody.WebViewLink);
    }

    public async Task TryDeleteAsync(string userId, string driveFileId)
    {
        var conn = await GetValidConnectionAsync(userId);
        if (conn == null) return;

        var service = BuildDriveClient(conn.AccessToken!);
        await service.Files.Delete(driveFileId).ExecuteAsync();
    }
}
