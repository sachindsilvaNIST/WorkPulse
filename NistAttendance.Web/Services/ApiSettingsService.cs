using System.Net.Http.Json;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.Web.Services;

public class ApiSettingsService : ISettingsService
{
    private readonly HttpClient _http;

    public ApiSettingsService(HttpClient http) => _http = http;

    public async Task<AppSettings> LoadAsync()
    {
        return await _http.GetFromJsonAsync<AppSettings>("api/settings")
            ?? new AppSettings();
    }

    public async Task SaveAsync(AppSettings settings)
    {
        await _http.PutAsJsonAsync("api/settings", settings);
    }
}
