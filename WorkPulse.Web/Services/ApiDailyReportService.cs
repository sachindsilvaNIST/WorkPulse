using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiDailyReportService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiDailyReportService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<DailyReport>> GetAllAsync()
    {
        return await _http.GetFromJsonAsync<List<DailyReport>>("api/dailyreports", _json) ?? new();
    }

    public async Task<DailyReport?> CreateAsync(DailyReport record)
    {
        var response = await _http.PostAsJsonAsync("api/dailyreports", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DailyReport>(_json);
    }

    public async Task<DailyReport?> UpdateAsync(string id, DailyReport record)
    {
        var response = await _http.PutAsJsonAsync($"api/dailyreports/{id}", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DailyReport>(_json);
    }

    public async Task DeleteAsync(string id)
    {
        await _http.DeleteAsync($"api/dailyreports/{id}");
    }
}
