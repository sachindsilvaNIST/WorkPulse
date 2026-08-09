using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiTripReportService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiTripReportService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<TripReport>> GetAllAsync()
    {
        return await _http.GetFromJsonAsync<List<TripReport>>("api/tripreports", _json) ?? new();
    }

    public async Task<TripReport?> CreateAsync(TripReport record)
    {
        var response = await _http.PostAsJsonAsync("api/tripreports", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<TripReport>(_json);
    }

    public async Task<TripReport?> UpdateAsync(string id, TripReport record)
    {
        var response = await _http.PutAsJsonAsync($"api/tripreports/{id}", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<TripReport>(_json);
    }

    public async Task DeleteAsync(string id)
    {
        await _http.DeleteAsync($"api/tripreports/{id}");
    }
}
