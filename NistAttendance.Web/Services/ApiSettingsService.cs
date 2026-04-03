using System.Net.Http.Json;
using System.Text.Json;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.Web.Services;

public class ApiSettingsService : ISettingsService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiSettingsService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<AppSettings> LoadAsync()
    {
        return await _http.GetFromJsonAsync<AppSettings>("api/settings", _json)
            ?? new AppSettings();
    }

    public async Task SaveAsync(AppSettings settings)
    {
        await _http.PutAsJsonAsync("api/settings", settings, _json);
    }
}
