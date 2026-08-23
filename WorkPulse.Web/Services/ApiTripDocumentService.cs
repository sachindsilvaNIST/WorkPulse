using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiTripDocumentService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiTripDocumentService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<TripDocumentMeta>> GetAllAsync(string tripId, string? search = null)
    {
        var url = $"api/tripreports/{tripId}/documents";
        if (!string.IsNullOrWhiteSpace(search))
            url += $"?search={Uri.EscapeDataString(search)}";

        return await _http.GetFromJsonAsync<List<TripDocumentMeta>>(url, _json) ?? new();
    }

    public async Task<(bool Success, TripDocumentMeta? Meta, string? Error)> UploadAsync(
        string tripId, Stream fileStream, string fileName, string contentType, string category, string? label)
    {
        using var form = new MultipartFormDataContent();
        var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(string.IsNullOrEmpty(contentType) ? "application/octet-stream" : contentType);
        form.Add(fileContent, "file", fileName);
        form.Add(new StringContent(category), "category");
        form.Add(new StringContent(label ?? ""), "label");

        var response = await _http.PostAsync($"api/tripreports/{tripId}/documents", form);
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            return (false, null, error);
        }

        var meta = await response.Content.ReadFromJsonAsync<TripDocumentMeta>(_json);
        return (true, meta, null);
    }

    public async Task<(bool Success, byte[]? Content, string? ContentType)> DownloadAsync(string tripId, string docId)
    {
        var response = await _http.GetAsync($"api/tripreports/{tripId}/documents/{docId}");
        if (!response.IsSuccessStatusCode) return (false, null, null);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        var contentType = response.Content.Headers.ContentType?.MediaType;
        return (true, bytes, contentType);
    }

    public async Task DeleteAsync(string tripId, string docId)
    {
        await _http.DeleteAsync($"api/tripreports/{tripId}/documents/{docId}");
    }
}
