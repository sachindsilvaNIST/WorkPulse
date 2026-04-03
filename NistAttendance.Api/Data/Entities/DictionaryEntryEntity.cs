namespace NistAttendance.Api.Data.Entities;

public class DictionaryEntryEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<DictionaryEntryLabelEntity> EntryLabels { get; set; } = new List<DictionaryEntryLabelEntity>();
}
