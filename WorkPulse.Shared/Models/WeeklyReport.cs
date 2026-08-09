using System;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class WeeklyReport
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateOnly WeekStartDate { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public string SearchText => $"{Title} {Body}".ToLowerInvariant();

    [JsonIgnore]
    public string Preview => Body.Length > 120 ? Body[..120] + "…" : Body;
}
