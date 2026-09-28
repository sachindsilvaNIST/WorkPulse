namespace WorkPulse.Api.Data.Entities;

/// <summary>One row of a Trip Application's Budget table — an estimated cost, filled in before
/// the trip. Compared against the Settlement's actual totals once the trip is done. Embedded
/// inside TripReportEntity.BudgetLines — no longer a top-level collection.</summary>
public class TripBudgetLineEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Content { get; set; } = "";
    public string ExpenseCategory { get; set; } = "";
    public decimal Amount { get; set; }
}
