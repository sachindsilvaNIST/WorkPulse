using System.Net.Http.Json;
using System.Text.Json;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.Web.Services;

public class ApiContactDataService : IContactDataService
{
    private readonly HttpClient _http;
    private readonly JsonSerializerOptions _json;

    public ApiContactDataService(HttpClient http, JsonSerializerOptions json)
    {
        _http = http;
        _json = json;
    }

    public async Task<ContactBookData> LoadContactsAsync()
    {
        return await _http.GetFromJsonAsync<ContactBookData>("api/contacts", _json)
            ?? new ContactBookData();
    }

    public async Task SaveContactsAsync(ContactBookData data)
    {
        await _http.PutAsJsonAsync("api/contacts", data, _json);
    }
}
