using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class JsonDataService : IDataService
{
    private readonly string _dataFolder;
    private readonly JsonSerializerOptions _jsonOptions;

    public JsonDataService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        _dataFolder = Path.Combine(appData, "NistAttendance");
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

public class DateOnlyJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => DateOnly.ParseExact(reader.GetString()!, "yyyy-MM-dd", CultureInfo.InvariantCulture);

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("yyyy-MM-dd"));
}

public class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => TimeOnly.ParseExact(reader.GetString()!, "HH:mm", CultureInfo.InvariantCulture);

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString("HH:mm"));
}
