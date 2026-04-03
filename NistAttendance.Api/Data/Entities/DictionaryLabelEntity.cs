namespace NistAttendance.Api.Data.Entities;

public class DictionaryLabelEntity
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#0078D4";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    public AppUser User { get; set; } = null!;
    public ICollection<DictionaryEntryLabelEntity> EntryLabels { get; set; } = new List<DictionaryEntryLabelEntity>();
}
