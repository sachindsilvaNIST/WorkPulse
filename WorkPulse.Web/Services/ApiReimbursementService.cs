using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;

namespace WorkPulse.Web.Services;

public class ApiReimbursementService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiReimbursementService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<List<TripDocumentWithTrip>> GetAllDocumentsAsync(string? search = null)
    {
        var url = "api/reimbursement/documents";
        if (!string.IsNullOrWhiteSpace(search))
            url += $"?search={Uri.EscapeDataString(search)}";

        return await _http.GetFromJsonAsync<List<TripDocumentWithTrip>>(url, _json) ?? new();
    }
}
