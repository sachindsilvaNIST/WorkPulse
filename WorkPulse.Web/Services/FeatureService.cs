using Microsoft.AspNetCore.Components.Authorization;

namespace WorkPulse.Web.Services;

/// <summary>
/// Reads per-user feature flags from the JWT auth state.
/// The API embeds a "disabled_features" claim containing a CSV of disabled feature keys
/// (admins are always exempt server-side, so this claim is never set for them).
/// </summary>
public class FeatureService
{
    /// <summary>Catalog of toggleable features. Mirror of AdminController.FeatureCatalog.</summary>
    public static readonly string[] Catalog = new[]
    {
        "calendar",
        "contacts",
        "dictionary",
        "notes",
        "notifications"
    };

    private readonly AuthenticationStateProvider _authState;

    public FeatureService(AuthenticationStateProvider authState)
    {
        _authState = authState;
    }

    public async Task<HashSet<string>> GetDisabledAsync()
    {
        var state = await _authState.GetAuthenticationStateAsync();
        var claim = state.User.FindFirst("disabled_features")?.Value;
        if (string.IsNullOrWhiteSpace(claim))
            return new HashSet<string>();
        return claim.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public async Task<bool> IsEnabledAsync(string featureKey)
    {
        var disabled = await GetDisabledAsync();
        return !disabled.Contains(featureKey);
    }
}
