using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.DTOs;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.Web.Services;

public class ApiDataService : IDataService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiDataService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<MonthlyData?> LoadMonthAsync(int year, int month)
    {
        var response = await _http.GetAsync($"api/attendance/{year}/{month}");
        if (!response.IsSuccessStatusCode)
            return null;
        return await response.Content.ReadFromJsonAsync<MonthlyData>(_json);
    }

    public async Task SaveMonthAsync(MonthlyData data)
    {
        await _http.PutAsJsonAsync($"api/attendance/{data.Year}/{data.Month}", data, _json);
    }

    public async Task<List<(int Year, int Month)>> GetAvailableMonthsAsync()
    {
        var dtos = await _http.GetFromJsonAsync<List<YearMonthDto>>("api/attendance/months", _json);
        return dtos?.Select(d => (d.Year, d.Month)).ToList() ?? new();
    }
}
