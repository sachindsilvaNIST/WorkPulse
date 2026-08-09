using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using WorkPulse.Converters;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class JsonDailyReportDataService : IDailyReportDataService
{
    private readonly ISettingsService _settingsService;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonDailyReportDataService(ISettingsService settingsService)
    {
        _settingsService = settingsService;

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters =
            {
                new JsonStringEnumConverter(),
                new DateOnlyJsonConverter(),
                new TimeOnlyJsonConverter()
            }
        };
    }

    private async Task<string> GetFilePathAsync()
    {
        var settings = await _settingsService.LoadAsync();
        var baseDir = string.IsNullOrWhiteSpace(settings.DefaultReportsDirectory)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "WorkPulse Reports")
            : settings.DefaultReportsDirectory;

        var folder = Path.Combine(baseDir, "DailyReports");
        Directory.CreateDirectory(folder);
        return Path.Combine(folder, "daily_reports.json");
    }

    public async Task<List<DailyReport>> LoadAllAsync()
    {
        var path = await GetFilePathAsync();
        if (!File.Exists(path))
            return new List<DailyReport>();

        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<List<DailyReport>>(json, _jsonOptions) ?? new List<DailyReport>();
    }

    public async Task SaveAllAsync(List<DailyReport> reports)
    {
        var now = DateTime.UtcNow;
        foreach (var r in reports)
        {
            if (r.LastModifiedUtc == default)
                r.LastModifiedUtc = now;
        }

        var path = await GetFilePathAsync();
        var tempPath = path + ".tmp";
        var json = JsonSerializer.Serialize(reports, _jsonOptions);
        await File.WriteAllTextAsync(tempPath, json);
        File.Move(tempPath, path, overwrite: true);
    }
}
