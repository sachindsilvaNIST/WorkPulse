using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using NistAttendance.Converters;
using NistAttendance.DTOs;

namespace NistAttendance.Services;

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
