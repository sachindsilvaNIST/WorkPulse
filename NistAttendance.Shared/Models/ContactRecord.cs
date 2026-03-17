using System;
using System.Text.Json.Serialization;

namespace NistAttendance.Models;

public class ContactRecord
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Affiliation { get; set; } = "";
    public string FamilyName { get; set; } = "";
    public string GivenName { get; set; } = "";
    public string Department { get; set; } = "";
    public string Email { get; set; } = "";
    public string Intercom { get; set; } = "";
    public string ContactNumber { get; set; } = "";
    public string Notes { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public string FullName => $"{FamilyName} {GivenName}".Trim();

    [JsonIgnore]
    public string SearchText =>
        $"{Affiliation} {FamilyName} {GivenName} {Department} {Email} {Intercom} {ContactNumber} {Notes}"
            .ToLowerInvariant();
}
