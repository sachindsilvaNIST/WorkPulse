namespace WorkPulse.Api.Data.Entities;

public class TripReportEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Category { get; set; } = "Domestic";
    /// <summary>Quick-display summary — the trip's primary destination. Kept in sync with the
    /// first TripSegment when segments are used; stands alone for a simple single-destination trip.</summary>
    public string Destination { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Purpose { get; set; } = "";
    public string Notes { get; set; } = "";
    /// <summary>"Draft" | "Submitted" | "Approved" | "Settled" — self-tracked (WorkPulse has no
    /// second-person approver role), but Approved/Settled block deletion server-side, mirroring
    /// the source workflow's "approved applications need a dedicated delete step" behavior.</summary>
    public string Status { get; set; } = "Draft";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Server-generated on create, "{yyyyMM}{seq:D4}" per user per month (e.g.
    /// "2026090024") — matches the source system's trip-number format.</summary>
    public string TripNumber { get; set; } = "";
    public string DepartmentCode { get; set; } = "";
    public DateTime? ScheduledDeparture { get; set; }
    public DateTime? ScheduledReturn { get; set; }
    public string TicketArrangementRequest { get; set; } = "";

    // Segments/BudgetLines/Settlement are embedded documents (always loaded and wholesale-replaced
    // together with the trip, same as the old EF Include()+RemoveRange pattern implied). Documents
    // stays a separate top-level collection — TripDocumentEntity.Content lives in GridFS, and
    // ReimbursementController needs to query documents across ALL of a user's trips at once, which
    // an embedded array would make into a cross-document $unwind instead of a plain collection scan.
    public ICollection<TripSegmentEntity> Segments { get; set; } = new List<TripSegmentEntity>();
    public ICollection<TripBudgetLineEntity> BudgetLines { get; set; } = new List<TripBudgetLineEntity>();
    public TripSettlementEntity? Settlement { get; set; }
}
