using System.Net.Http.Json;
using System.Text.Json;

namespace WorkPulse.Web.Services;

public class ApiDictionaryService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiDictionaryService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    // ===== ENTRIES =====

    public async Task<List<DictEntryDto>> GetEntriesAsync(string? search = null, int? labelId = null)
    {
        var url = "api/dictionary/entries";
        var queryParams = new List<string>();
        if (!string.IsNullOrWhiteSpace(search)) queryParams.Add($"search={Uri.EscapeDataString(search)}");
        if (labelId.HasValue) queryParams.Add($"labelId={labelId}");
        if (queryParams.Count > 0) url += "?" + string.Join("&", queryParams);

        return await _http.GetFromJsonAsync<List<DictEntryDto>>(url, _json) ?? new();
    }

    public async Task<DictEntryDto?> CreateEntryAsync(DictEntryCreateDto dto)
    {
        var response = await _http.PostAsJsonAsync("api/dictionary/entries", dto, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DictEntryDto>(_json);
    }

    public async Task<DictEntryDto?> UpdateEntryAsync(int id, DictEntryCreateDto dto)
    {
        var response = await _http.PutAsJsonAsync($"api/dictionary/entries/{id}", dto, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DictEntryDto>(_json);
    }

    public async Task DeleteEntryAsync(int id)
    {
        await _http.DeleteAsync($"api/dictionary/entries/{id}");
    }

    // ===== LABELS =====

    public async Task<List<DictLabelDto>> GetLabelsAsync()
    {
        return await _http.GetFromJsonAsync<List<DictLabelDto>>("api/dictionary/labels", _json) ?? new();
    }

    public async Task<DictLabelDto?> CreateLabelAsync(DictLabelCreateDto dto)
    {
        var response = await _http.PostAsJsonAsync("api/dictionary/labels", dto, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DictLabelDto>(_json);
    }

    public async Task UpdateLabelAsync(int id, DictLabelCreateDto dto)
    {
        await _http.PutAsJsonAsync($"api/dictionary/labels/{id}", dto, _json);
    }

    public async Task DeleteLabelAsync(int id)
    {
        await _http.DeleteAsync($"api/dictionary/labels/{id}");
    }
}

// Shared DTOs (mirroring API DTOs)
public class DictEntryDto
{
    public int Id { get; set; }
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastModifiedUtc { get; set; }
    public List<DictLabelDto> Labels { get; set; } = new();
}

public class DictEntryCreateDto
{
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public List<int>? LabelIds { get; set; }
}

public class DictLabelDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#0078D4";
    public int EntryCount { get; set; }
}

public class DictLabelCreateDto
{
    public string Name { get; set; } = "";
    public string? Color { get; set; }
}
