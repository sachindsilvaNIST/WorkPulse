namespace WorkPulse.Api.Data.Entities;

public class DictionaryEntryEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public string? JlptLevel { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    // ===== Spaced repetition (SM-2 variant) =====
    public int SrsRepetitions { get; set; }              // Consecutive successful reviews
    public double SrsEaseFactor { get; set; } = 2.5;     // Difficulty multiplier (SM-2)
    public int SrsIntervalDays { get; set; }             // Current interval
    public DateTime? SrsNextReviewUtc { get; set; }      // Null = brand new, never reviewed
    public DateTime? SrsLastReviewUtc { get; set; }
    public int SrsReviewCount { get; set; }              // Total reviews (incl. failures)

    // Replaces the old DictionaryEntryLabelEntity many-to-many join table — Mongo has no FK
    // support, so the "many" side just holds the other side's ids directly, hydrated against
    // DictionaryLabels in-memory where needed (same technique SharesController.SharedWithMe
    // already used for owner-name lookups).
    public List<string> LabelIds { get; set; } = new();
}
