namespace WorkPulse.Models;

/// <summary>One row of a Trip Application's Budget table — an estimated cost.</summary>
public class TripBudgetLine
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Content { get; set; } = "";
    public string ExpenseCategory { get; set; } = "";
    public decimal Amount { get; set; }
}
