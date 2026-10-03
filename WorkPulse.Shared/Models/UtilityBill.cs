using System;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class UtilityBill
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public UtilityProvider Provider { get; set; } = UtilityProvider.TokyoGas;

    /// <summary>The month the bill is for — billing is monthly for gas but every two months for water,
    /// so this is the bill's own month rather than a derived one.</summary>
    public int BillingYear { get; set; }
    public int BillingMonth { get; set; }

    /// <summary>Usage period covered by the bill (water example: 2026-07-23 → 2026-09-17). Optional.</summary>
    public DateOnly? PeriodStart { get; set; }
    public DateOnly? PeriodEnd { get; set; }

    /// <summary>検針日 — the meter reading date. Optional.</summary>
    public DateOnly? MeterReadingDate { get; set; }

    public decimal? UsageAmount { get; set; }
    public string UsageUnit { get; set; } = "m³";

    /// <summary>Water only — sewer usage in m³, recorded separately from UsageAmount.</summary>
    public decimal? SewerUsageAmount { get; set; }

    /// <summary>Total billed amount in JPY, tax included.</summary>
    public int AmountJpy { get; set; }
    public UtilityBillBreakdown? Breakdown { get; set; }

    /// <summary>支払期限.</summary>
    public DateOnly DueDate { get; set; }
    public DateOnly? PaidDate { get; set; }
    public UtilityPaymentMethod? PaymentMethod { get; set; }

    /// <summary>Always computed server-side on read — see UtilityBillStatusCalculator.</summary>
    public UtilityBillStatus Status { get; set; } = UtilityBillStatus.Unpaid;

    /// <summary>受付番号 — optional reference from the bill or payment confirmation.</summary>
    public string? ReceiptRef { get; set; }
    public string Notes { get; set; } = "";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    /// <summary>How many receipt files are attached — populated by UtilityBillsController.GetAll.</summary>
    public int DocumentCount { get; set; }
}
