using System.Net.Http.Json;
using Blazored.LocalStorage;
using WorkPulse.DTOs;

namespace WorkPulse.Web.Services;

public class AuthService
{
    private readonly HttpClient _http;
    private readonly ILocalStorageService _localStorage;
    private readonly JwtAuthStateProvider _authState;

    public AuthService(HttpClient http, ILocalStorageService localStorage, JwtAuthStateProvider authState)
    {
        _http = http;
        _localStorage = localStorage;
        _authState = authState;
    }

    public async Task<(bool Success, string? Error)> RegisterAsync(string email, string password, string displayName)
    {
        var response = await _http.PostAsJsonAsync("api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = password,
            DisplayName = displayName
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return (false, error);
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        if (auth != null)
            await StoreTokens(auth);

        return (true, null);
    }

    public async Task<(bool Success, string? Error)> LoginAsync(string email, string password)
    {
        var response = await _http.PostAsJsonAsync("api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return (false, error);
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        if (auth != null)
            await StoreTokens(auth);

        return (true, null);
    }

    public async Task LogoutAsync()
    {
        await _localStorage.RemoveItemAsync("authToken");
        await _localStorage.RemoveItemAsync("refreshToken");
        _authState.NotifyUserLogout();
    }

    private async Task StoreTokens(AuthResponse auth)
    {
        await _localStorage.SetItemAsStringAsync("authToken", auth.Token);
        await _localStorage.SetItemAsStringAsync("refreshToken", auth.RefreshToken);
        _authState.NotifyUserLogin(auth.Token);
    }
}
