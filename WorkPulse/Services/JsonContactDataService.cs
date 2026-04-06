using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class JsonContactDataService : IContactDataService
{
    private readonly string _filePath;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonContactDataService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var folder = Path.Combine(appData, "WorkPulse");
        Directory.CreateDirectory(folder);
        _filePath = Path.Combine(folder, "contacts.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new JsonStringEnumConverter() }
        };
    }

    public async Task<ContactBookData> LoadContactsAsync()
    {
        if (!File.Exists(_filePath))
            return new ContactBookData();

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<ContactBookData>(json, _jsonOptions)
            ?? new ContactBookData();
    }

    public async Task SaveContactsAsync(ContactBookData data)
    {
        var now = DateTime.UtcNow;
        foreach (var c in data.Contacts)
        {
            if (c.LastModifiedUtc == default)
                c.LastModifiedUtc = now;
        }
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }
}
