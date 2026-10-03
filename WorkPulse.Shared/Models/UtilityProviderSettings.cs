using System;

namespace WorkPulse.Models;

public class UtilityProviderSettings
{
    public UtilityProvider Provider { get; set; } = UtilityProvider.TokyoGas;

    /// <summary>お客さま番号 — the customer number printed on the provider's bills.</summary>
    public string CustomerNumber { get; set; } = "";
    public UtilityPaymentMethod? CurrentPaymentMethod { get; set; }

    /// <summary>When CurrentPaymentMethod was last changed — lets bills before this date be
    /// recorded under the previous method (e.g. "slips before 2026-10-01 were paid by hand").</summary>
    public DateOnly? PaymentMethodChangedDate { get; set; }
}
