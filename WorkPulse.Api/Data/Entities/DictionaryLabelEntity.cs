namespace WorkPulse.Api.Data.Entities;

public class DictionaryLabelEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#0078D4";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
