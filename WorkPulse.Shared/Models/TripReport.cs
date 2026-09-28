using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class TripReport
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public TripCategory Category { get; set; } = TripCategory.Domestic;

    /// <summary>Quick-display summary — the trip's primary destination. Kept in sync with the
    /// first Segment when segments are used; stands alone for a simple single-destination trip.</summary>
    public string Destination { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Purpose { get; set; } = "";
    public string Notes { get; set; } = "";
    public TripStatus Status { get; set; } = TripStatus.Draft;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    /// <summary>Server-generated on create, "{yyyyMM}{seq:D4}" per user per month.</summary>
    public string TripNumber { get; set; } = "";
    public string DepartmentCode { get; set; } = "";
    public DateTime? ScheduledDeparture { get; set; }
    public DateTime? ScheduledReturn { get; set; }
    public string TicketArrangementRequest { get; set; } = "";
    public List<TripSegment> Segments { get; set; } = new();
    public List<TripBudgetLine> BudgetLines { get; set; } = new();

    [JsonIgnore]
    public decimal BudgetTotal => BudgetLines.Sum(l => l.Amount);

    /// <summary>How many documents (reimbursement receipts/invoices/etc.) are linked to this
    /// trip — populated by TripReportsController.GetAll so Business Trips can show it on each
    /// trip card without a separate request per trip.</summary>
    public int DocumentCount { get; set; }

    [JsonIgnore]
    public string SearchText => $"{TripNumber} {Destination} {Purpose} {Notes} {Category} {DepartmentCode}".ToLowerInvariant();
}
