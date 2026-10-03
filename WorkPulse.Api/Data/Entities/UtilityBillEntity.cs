namespace WorkPulse.Api.Data.Entities;

public class UtilityBillEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    /// <summary>"TokyoGas" | "TokyoWater" — stored as the enum name, same convention as TripReportEntity.Category.</summary>
    public string Provider { get; set; } = "TokyoGas";
    public int BillingYear { get; set; }
    public int BillingMonth { get; set; }
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }
    public DateOnly? MeterReadingDate { get; set; }
    public decimal? UsageAmount { get; set; }
    public string UsageUnit { get; set; } = "m³";
    public decimal? SewerUsageAmount { get; set; }
    public int AmountJpy { get; set; }
    public UtilityBillBreakdownEntity? Breakdown { get; set; }
    public DateOnly DueDate { get; set; }
    public DateOnly? PaidDate { get; set; }
    public string? PaymentMethod { get; set; }
    public string? ReceiptRef { get; set; }
    public string Notes { get; set; } = "";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;
}
