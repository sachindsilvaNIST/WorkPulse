using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Services;

/// <summary>OAuth + Gmail API access for the corporate label-manager section. Kept as its own
/// connection (separate from GoogleDriveService/GoogleDriveConnectionEntity) since it's a
/// distinct, more sensitive scope and typically a different Google account than Drive.</summary>
public class GmailService
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string AuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string GmailApiBase = "https://gmail.googleapis.com/gmail/v1/users/me";
    // gmail.modify covers reading messages, label CRUD, and applying/removing labels on messages.
    // userinfo.email is also needed — without it, the userinfo call GetEmailAddressAsync makes to
    // show "Connected as ..." on the Settings card returns 401.
    private const string GmailScope = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email";

    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<GmailService> _logger;

    public GmailService(AppDbContext db, IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<GmailService> logger)
    {
        _db = db;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    private string ClientId => _config["Google:ClientId"] ?? "";
    private string ClientSecret => _config["Google:ClientSecret"] ?? "";
    private string RedirectUri => _config["Gmail:RedirectUri"] ?? "http://localhost:5050/api/gmail/callback";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret);

    /// <summary>Same access_type=offline + prompt=consent reasoning as GoogleDriveService: without
    /// prompt=consent, Google only issues a refresh token on the very first grant, so a
    /// disconnect/reconnect would silently stop getting one.</summary>
    public string GetAuthorizationUrl(string state)
    {
        var query = new Dictionary<string, string>
        {
            ["client_id"] = ClientId,
            ["redirect_uri"] = RedirectUri,
            ["response_type"] = "code",
            ["scope"] = GmailScope,
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
    /// persisting it first if needed. Null if the user hasn't connected Gmail.</summary>
    public async Task<GmailConnectionEntity?> GetValidConnectionAsync(string userId)
    {
        var conn = await _db.GmailConnections.FirstOrDefaultAsync(c => c.UserId == userId);
        if (conn == null) return null;

        if (conn.AccessToken == null || conn.AccessTokenExpiryUtc == null || conn.AccessTokenExpiryUtc < DateTime.UtcNow.AddSeconds(60))
        {
            var (accessToken, expiresIn) = await RefreshAccessTokenAsync(conn.RefreshToken);
            conn.AccessToken = accessToken;
            conn.AccessTokenExpiryUtc = DateTime.UtcNow.AddSeconds(expiresIn);
            await _db.SaveChangesAsync();
        }

        return conn;
    }

    /// <summary>The Gmail address the connected refresh token belongs to — fetched once at
    /// connect time (via the userinfo endpoint) since Gmail's own API has no "whoami" call.</summary>
    public async Task<string> GetEmailAddressAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var res = await client.SendAsync(request);
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Failed to fetch Google userinfo: {body}");

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("email").GetString() ?? "";
    }

    private async Task<HttpResponseMessage> SendAsync(string accessToken, HttpMethod method, string url, object? jsonBody = null)
    {
        var client = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        if (jsonBody != null)
            request.Content = new StringContent(JsonSerializer.Serialize(jsonBody), System.Text.Encoding.UTF8, "application/json");
        return await client.SendAsync(request);
    }

    public record GmailLabelDto(string Id, string Name, string Type, string? Color);

    public async Task<List<GmailLabelDto>> ListLabelsAsync(string accessToken)
    {
        var res = await SendAsync(accessToken, HttpMethod.Get, $"{GmailApiBase}/labels");
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gmail labels.list failed: {Body}", body);
            throw new InvalidOperationException($"Gmail labels.list failed: {body}");
        }

        using var doc = JsonDocument.Parse(body);
        var labels = new List<GmailLabelDto>();
        if (doc.RootElement.TryGetProperty("labels", out var arr))
        {
            foreach (var el in arr.EnumerateArray())
            {
                var color = el.TryGetProperty("color", out var c) && c.TryGetProperty("backgroundColor", out var bg)
                    ? bg.GetString()
                    : null;
                labels.Add(new GmailLabelDto(
                    el.GetProperty("id").GetString()!,
                    el.GetProperty("name").GetString()!,
                    el.GetProperty("type").GetString()!,
                    color));
            }
        }
        return labels;
    }

    public async Task<GmailLabelDto> CreateLabelAsync(string accessToken, string name)
    {
        var res = await SendAsync(accessToken, HttpMethod.Post, $"{GmailApiBase}/labels", new { name });
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gmail labels.create failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var el = doc.RootElement;
        return new GmailLabelDto(el.GetProperty("id").GetString()!, el.GetProperty("name").GetString()!, el.GetProperty("type").GetString()!, null);
    }

    public async Task<GmailLabelDto> RenameLabelAsync(string accessToken, string gmailLabelId, string newName)
    {
        var res = await SendAsync(accessToken, HttpMethod.Patch, $"{GmailApiBase}/labels/{gmailLabelId}", new { name = newName });
        var body = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gmail labels.patch failed: {body}");

        using var doc = JsonDocument.Parse(body);
        var el = doc.RootElement;
        return new GmailLabelDto(el.GetProperty("id").GetString()!, el.GetProperty("name").GetString()!, el.GetProperty("type").GetString()!, null);
    }

    public async Task DeleteLabelAsync(string accessToken, string gmailLabelId)
    {
        var res = await SendAsync(accessToken, HttpMethod.Delete, $"{GmailApiBase}/labels/{gmailLabelId}");
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Gmail labels.delete failed: {body}");
        }
    }
}
