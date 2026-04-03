namespace NistAttendance.Api.Data.Entities;

public class DictionaryEntryLabelEntity
{
    public int EntryId { get; set; }
    public DictionaryEntryEntity Entry { get; set; } = null!;

    public int LabelId { get; set; }
    public DictionaryLabelEntity Label { get; set; } = null!;
}
