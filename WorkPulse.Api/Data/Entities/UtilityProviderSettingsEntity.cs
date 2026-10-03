namespace WorkPulse.Api.Data.Entities;

/// <summary>One row per (user, provider). Holds only the account identifier and payment-method
/// history — no secrets, so unlike GoogleDriveConnectionEntity it maps straight to its DTO.</summary>
public class UtilityProviderSettingsEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = "";
    public string Provider { get; set; } = "TokyoGas";
    public string CustomerNumber { get; set; } = "";
    public string? CurrentPaymentMethod { get; set; }
    public DateOnly? PaymentMethodChangedDate { get; set; }
}
