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

    public async Task<List<DictEntryDto>> GetEntriesAsync(string? search = null, int? labelId = null, string? jlptLevel = null)
    {
        var url = "api/dictionary/entries";
        var queryParams = new List<string>();
        if (!string.IsNullOrWhiteSpace(search)) queryParams.Add($"search={Uri.EscapeDataString(search)}");
        if (labelId.HasValue) queryParams.Add($"labelId={labelId}");
        if (!string.IsNullOrWhiteSpace(jlptLevel)) queryParams.Add($"jlptLevel={Uri.EscapeDataString(jlptLevel)}");
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

    // ===== SRS =====

    public async Task<List<DictEntryDto>> GetSrsQueueAsync(int limit = 20)
    {
        return await _http.GetFromJsonAsync<List<DictEntryDto>>($"api/dictionary/srs/queue?limit={limit}", _json) ?? new();
    }

    public async Task<SrsStatsDto?> GetSrsStatsAsync()
    {
        try { return await _http.GetFromJsonAsync<SrsStatsDto>("api/dictionary/srs/stats", _json); }
        catch { return null; }
    }

    public async Task<DictEntryDto?> ReviewEntryAsync(int id, int grade)
    {
        var response = await _http.PostAsJsonAsync($"api/dictionary/srs/review/{id}", new { Grade = grade }, _json);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DictEntryDto>(_json);
    }

    public async Task<List<DictExampleDto>?> GenerateExamplesAsync(string japanese, string? reading, string meaning)
    {
        var response = await _http.PostAsJsonAsync("api/dictionary/generate-examples", new { Japanese = japanese, Reading = reading, Meaning = meaning }, _json);
        if (!response.IsSuccessStatusCode) return null;
        var body = await response.Content.ReadFromJsonAsync<GenerateExamplesResponse>(_json);
        return body?.Examples;
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
    public string? JlptLevel { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastModifiedUtc { get; set; }
    public int SrsRepetitions { get; set; }
    public int SrsIntervalDays { get; set; }
    public DateTime? SrsNextReviewUtc { get; set; }
    public int SrsReviewCount { get; set; }
    public List<DictLabelDto> Labels { get; set; } = new();
}

public class SrsStatsDto
{
    public int Total { get; set; }
    public int DueNow { get; set; }
    public int New { get; set; }
    public int Learning { get; set; }
    public int Mature { get; set; }
}

public class DictEntryCreateDto
{
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public string? JlptLevel { get; set; }
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

public class DictExampleDto
{
    public string Jp { get; set; } = "";
    public string En { get; set; } = "";
}

public class GenerateExamplesResponse
{
    public List<DictExampleDto> Examples { get; set; } = new();
}
