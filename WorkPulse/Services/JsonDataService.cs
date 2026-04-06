using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using WorkPulse.Converters;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class JsonDataService : IDataService
{
    private readonly string _dataFolder;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonDataService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        _dataFolder = Path.Combine(appData, "WorkPulse");
        Directory.CreateDirectory(_dataFolder);

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

    private string GetFilePath(int year, int month)
        => Path.Combine(_dataFolder, $"attendance_{year}_{month:D2}.json");

    public async Task<MonthlyData?> LoadMonthAsync(int year, int month)
    {
        var path = GetFilePath(year, month);
        if (!File.Exists(path))
            return null;

        var json = await File.ReadAllTextAsync(path);
        return JsonSerializer.Deserialize<MonthlyData>(json, _jsonOptions);
    }

    public async Task SaveMonthAsync(MonthlyData data)
    {
        data.LastModifiedUtc = DateTime.UtcNow;
        var path = GetFilePath(data.Year, data.Month);
        var json = JsonSerializer.Serialize(data, _jsonOptions);
        await File.WriteAllTextAsync(path, json);
    }

    public Task<List<(int Year, int Month)>> GetAvailableMonthsAsync()
    {
        var result = new List<(int Year, int Month)>();
        if (!Directory.Exists(_dataFolder))
            return Task.FromResult(result);

        foreach (var file in Directory.GetFiles(_dataFolder, "attendance_*.json"))
        {
            var name = Path.GetFileNameWithoutExtension(file);
            var parts = name.Split('_');
            if (parts.Length == 3
                && int.TryParse(parts[1], out var year)
                && int.TryParse(parts[2], out var month))
            {
                result.Add((year, month));
            }
        }

        return Task.FromResult(result.OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month).ToList());
    }
}
