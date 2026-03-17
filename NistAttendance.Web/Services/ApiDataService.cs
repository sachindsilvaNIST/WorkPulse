using System.Net.Http.Json;
using NistAttendance.DTOs;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.Web.Services;

public class ApiDataService : IDataService
{
    private readonly HttpClient _http;

    public ApiDataService(HttpClient http) => _http = http;

    public async Task<MonthlyData?> LoadMonthAsync(int year, int month)
    {
        var response = await _http.GetAsync($"api/attendance/{year}/{month}");
        if (!response.IsSuccessStatusCode)
            return null;
        return await response.Content.ReadFromJsonAsync<MonthlyData>();
    }

    public async Task SaveMonthAsync(MonthlyData data)
    {
        await _http.PutAsJsonAsync($"api/attendance/{data.Year}/{data.Month}", data);
    }

    public async Task<List<(int Year, int Month)>> GetAvailableMonthsAsync()
    {
        var dtos = await _http.GetFromJsonAsync<List<YearMonthDto>>("api/attendance/months");
        return dtos?.Select(d => (d.Year, d.Month)).ToList() ?? new();
    }
}
