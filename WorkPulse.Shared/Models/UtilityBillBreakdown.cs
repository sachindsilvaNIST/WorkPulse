namespace WorkPulse.Models;

/// <summary>Optional itemization of a bill's total (AmountJpy) — all nullable since most bills
/// are entered with just the total and a few of these, not every field every time.</summary>
public class UtilityBillBreakdown
{
    public decimal? WaterCharge { get; set; }
    public decimal? SewerCharge { get; set; }
    public decimal? ConsumptionTax { get; set; }
    public decimal? SlipIssuingFee { get; set; }
    public decimal? LateInterest { get; set; }
}
