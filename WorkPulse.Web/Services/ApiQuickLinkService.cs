using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiQuickLinkService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiQuickLinkService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<QuickLink>> GetAllAsync()
    {
        return await _http.GetFromJsonAsync<List<QuickLink>>("api/quicklinks", _json) ?? new();
    }

    public async Task<QuickLink?> CreateAsync(QuickLink record)
    {
        var response = await _http.PostAsJsonAsync("api/quicklinks", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<QuickLink>(_json);
    }

    public async Task<QuickLink?> UpdateAsync(string id, QuickLink record)
    {
        var response = await _http.PutAsJsonAsync($"api/quicklinks/{id}", record, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<QuickLink>(_json);
    }

    public async Task DeleteAsync(string id)
    {
        await _http.DeleteAsync($"api/quicklinks/{id}");
    }
}
