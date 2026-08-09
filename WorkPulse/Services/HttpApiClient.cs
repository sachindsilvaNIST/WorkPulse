using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using WorkPulse.Converters;
using WorkPulse.DTOs;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class HttpApiClient : IDisposable
{
    private HttpClient _http;
    private readonly JsonSerializerOptions _jsonOptions;
    private string? _token;
    private string? _refreshToken;

    public bool IsAuthenticated => !string.IsNullOrEmpty(_token);
    public string? CurrentToken => _token;
    public string? CurrentRefreshToken => _refreshToken;

    public HttpApiClient()
    {
        _http = new HttpClient();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        _jsonOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        _jsonOptions.Converters.Add(new DateOnlyJsonConverter());
        _jsonOptions.Converters.Add(new TimeOnlyJsonConverter());
    }

    public void SetBaseUrl(string url)
    {
        // Recreate HttpClient to avoid InvalidOperationException
        // when BaseAddress is changed after a request
        var newBase = new Uri(url.TrimEnd('/') + "/");
        _http = new HttpClient { BaseAddress = newBase };
        if (!string.IsNullOrEmpty(_token))
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _token);
    }

    public void SetTokens(string token, string refreshToken)
    {
        _token = token;
        _refreshToken = refreshToken;
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public void ClearTokens()
    {
        _token = null;
        _refreshToken = null;
        _http.DefaultRequestHeaders.Authorization = null;
    }

    public async Task<(bool Success, AuthResponse? Auth, string? Error)> LoginAsync(string email, string password)
    {
        var response = await _http.PostAsJsonAsync("api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return (false, null, $"Login failed: {error}");
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(_jsonOptions);
        if (auth != null)
            SetTokens(auth.Token, auth.RefreshToken);

        return (true, auth, null);
    }

    public async Task<(bool Success, string? Error)> RefreshTokenAsync()
    {
        if (string.IsNullOrEmpty(_refreshToken))
            return (false, "No refresh token available");

        var response = await _http.PostAsJsonAsync("api/auth/refresh", new { RefreshToken = _refreshToken });

        if (!response.IsSuccessStatusCode)
        {
            ClearTokens();
            return (false, "Token refresh failed, please login again");
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>(_jsonOptions);
        if (auth != null)
            SetTokens(auth.Token, auth.RefreshToken);

        return (true, null);
    }

    public async Task<SyncResponse?> PushAsync(SyncRequest request)
    {
        var response = await SendWithRetry(() =>
            _http.PostAsJsonAsync("api/sync/push", request, _jsonOptions));

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Push failed ({response.StatusCode}): {body}");
        }
        return await response.Content.ReadFromJsonAsync<SyncResponse>(_jsonOptions);
    }

    public async Task<SyncResponse?> PullAsync(DateTime since)
    {
        var response = await SendWithRetry(() =>
            _http.PostAsJsonAsync("api/sync/pull", new { LastSyncedAt = since }, _jsonOptions));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<SyncResponse>(_jsonOptions);
    }

    // --- Reimbursement: cross-trip document library ---

    public async Task<List<TripDocumentWithTrip>> GetAllDocumentsAsync(string? search = null)
    {
        var url = "api/reimbursement/documents";
        if (!string.IsNullOrWhiteSpace(search))
            url += $"?search={Uri.EscapeDataString(search)}";

        var response = await SendWithRetry(() => _http.GetAsync(url));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<TripDocumentWithTrip>>(_jsonOptions) ?? new();
    }

    // --- Trip documents (API-only; not part of the local JSON sync payload) ---

    public async Task<List<TripDocumentMeta>> GetTripDocumentsAsync(string tripId, string? search = null)
    {
        var url = $"api/tripreports/{tripId}/documents";
        if (!string.IsNullOrWhiteSpace(search))
            url += $"?search={Uri.EscapeDataString(search)}";

        var response = await SendWithRetry(() => _http.GetAsync(url));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<TripDocumentMeta>>(_jsonOptions) ?? new();
    }

    public async Task<(bool Success, TripDocumentMeta? Meta, string? Error)> UploadTripDocumentAsync(
        string tripId, string filePath, DocCategory category, string? label)
    {
        using var form = new MultipartFormDataContent();
        var fileBytes = await File.ReadAllBytesAsync(filePath);
        var fileContent = new ByteArrayContent(fileBytes);
        form.Add(fileContent, "file", Path.GetFileName(filePath));
        form.Add(new StringContent(category.ToString()), "category");
        form.Add(new StringContent(label ?? ""), "label");

        var response = await SendWithRetry(() => _http.PostAsync($"api/tripreports/{tripId}/documents", form));

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return (false, null, $"Upload failed: {error}");
        }

        var meta = await response.Content.ReadFromJsonAsync<TripDocumentMeta>(_jsonOptions);
        return (true, meta, null);
    }

    public async Task<(bool Success, byte[]? Content, string? FileName, string? Error)> DownloadTripDocumentAsync(string tripId, string docId)
    {
        var response = await SendWithRetry(() => _http.GetAsync($"api/tripreports/{tripId}/documents/{docId}"));

        if (!response.IsSuccessStatusCode)
            return (false, null, null, $"Download failed: {response.StatusCode}");

        var bytes = await response.Content.ReadAsByteArrayAsync();
        var fileName = response.Content.Headers.ContentDisposition?.FileNameStar
            ?? response.Content.Headers.ContentDisposition?.FileName
            ?? "download";
        return (true, bytes, fileName.Trim('"'), null);
    }

    public async Task DeleteTripDocumentAsync(string tripId, string docId)
    {
        await SendWithRetry(() => _http.DeleteAsync($"api/tripreports/{tripId}/documents/{docId}"));
    }

    private async Task<HttpResponseMessage> SendWithRetry(Func<Task<HttpResponseMessage>> action)
    {
        var response = await action();

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            var (refreshed, _) = await RefreshTokenAsync();
            if (refreshed)
                response = await action();
        }

        return response;
    }

    public void Dispose()
    {
        _http.Dispose();
    }
}
