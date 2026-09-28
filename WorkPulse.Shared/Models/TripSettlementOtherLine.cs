namespace WorkPulse.Models;

/// <summary>One row of the Settlement's "Other" expense table — misc costs outside the
/// transportation table, each allocated to one department code.</summary>
public class TripSettlementOtherLine
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateOnly? Date { get; set; }
    public string Content { get; set; } = "";
    public string Description { get; set; } = "";
    public string DepartmentCode { get; set; } = "";
    public string ExpenseCategoryTaxCode { get; set; } = "";
    public decimal SettlementAmount { get; set; }
}
