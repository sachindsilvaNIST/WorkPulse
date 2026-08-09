using System;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class QuickLink
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Label { get; set; } = "";
    public string Url { get; set; } = "";
    public string Category { get; set; } = "";

    /// <summary>Comma-separated alternate search terms (e.g. "cloud, storage, gdrive") so a bookmark can be found by synonyms, not just its label.</summary>
    public string Keywords { get; set; } = "";
    public int SortOrder { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public string SearchText => $"{Label} {Url} {Category} {Keywords}".ToLowerInvariant();
}
