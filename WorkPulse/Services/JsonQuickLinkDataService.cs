using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class JsonQuickLinkDataService : IQuickLinkDataService
{
    private readonly string _filePath;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonQuickLinkDataService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var folder = Path.Combine(appData, "WorkPulse");
        Directory.CreateDirectory(folder);
        _filePath = Path.Combine(folder, "quicklinks.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new JsonStringEnumConverter() }
        };
    }

    public async Task<List<QuickLink>> LoadAllAsync()
    {
        if (!File.Exists(_filePath))
            return new List<QuickLink>();

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<List<QuickLink>>(json, _jsonOptions) ?? new List<QuickLink>();
    }

    public async Task SaveAllAsync(List<QuickLink> links)
    {
        var now = DateTime.UtcNow;
        foreach (var l in links)
        {
            if (l.LastModifiedUtc == default)
                l.LastModifiedUtc = now;
        }

        var tempPath = _filePath + ".tmp";
        var json = JsonSerializer.Serialize(links, _jsonOptions);
        await File.WriteAllTextAsync(tempPath, json);
        File.Move(tempPath, _filePath, overwrite: true);
    }
}
