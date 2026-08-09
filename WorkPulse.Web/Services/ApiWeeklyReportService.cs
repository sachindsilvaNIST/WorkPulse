using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiWeeklyReportService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiWeeklyReportService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<WeeklyReport>> GetAllAsync()
    {
        return await _http.GetFromJsonAsync<List<WeeklyReport>>("api/weeklyreports", _json) ?? new();
    }

    public async Task<WeeklyReport?> CreateAsync(WeeklyReport record)
    {
        var response = await _http.PostAsJsonAsync("api/weeklyreports", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<WeeklyReport>(_json);
    }

    public async Task<WeeklyReport?> UpdateAsync(string id, WeeklyReport record)
    {
        var response = await _http.PutAsJsonAsync($"api/weeklyreports/{id}", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<WeeklyReport>(_json);
    }

    public async Task DeleteAsync(string id)
    {
        await _http.DeleteAsync($"api/weeklyreports/{id}");
    }
}
