using System.Net.Http.Json;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.Web.Services;

public class ApiContactDataService : IContactDataService
{
    private readonly HttpClient _http;

    public ApiContactDataService(HttpClient http) => _http = http;

    public async Task<ContactBookData> LoadContactsAsync()
    {
        return await _http.GetFromJsonAsync<ContactBookData>("api/contacts")
            ?? new ContactBookData();
    }

    public async Task SaveContactsAsync(ContactBookData data)
    {
        await _http.PutAsJsonAsync("api/contacts", data);
    }
}
