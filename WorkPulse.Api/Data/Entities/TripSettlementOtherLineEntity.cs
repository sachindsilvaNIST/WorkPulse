namespace WorkPulse.Api.Data.Entities;

/// <summary>One row of the Settlement's "Other" expense table — misc costs outside the
/// transportation table (e.g. supplies, entertainment), each allocated to one department code.
/// Embedded inside TripSettlementEntity.OtherLines — no longer a top-level collection.</summary>
public class TripSettlementOtherLineEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateOnly? Date { get; set; }
    public string Content { get; set; } = "";
    public string Description { get; set; } = "";
    public string DepartmentCode { get; set; } = "";
    public string ExpenseCategoryTaxCode { get; set; } = "";
    public decimal SettlementAmount { get; set; }
}
