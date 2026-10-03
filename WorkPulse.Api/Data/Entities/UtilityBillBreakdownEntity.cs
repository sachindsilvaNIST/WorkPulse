namespace WorkPulse.Api.Data.Entities;

public class UtilityBillBreakdownEntity
{
    public decimal? WaterCharge { get; set; }
    public decimal? SewerCharge { get; set; }
    public decimal? ConsumptionTax { get; set; }
    public decimal? SlipIssuingFee { get; set; }
    public decimal? LateInterest { get; set; }
}
