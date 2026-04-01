using System;
using System.Threading.Tasks;

namespace NistAttendance.Services;

public interface ISyncService
{
    bool IsLoggedIn { get; }
    bool IsSyncing { get; }
    string? LastError { get; }

    /// <summary>Raised after a sync completes (success or failure).</summary>
    event Action<bool>? SyncCompleted;

    Task<(bool Success, string? Error)> LoginAsync(string serverUrl, string email, string password);
    Task LogoutAsync();
    Task<(bool Success, string? Error)> SyncAsync();

    /// <summary>Start periodic background sync (every intervalSeconds).</summary>
    void StartAutoSync(int intervalSeconds = 5);

    /// <summary>Stop periodic background sync.</summary>
    void StopAutoSync();

    /// <summary>Try to reconnect using saved credentials on startup.</summary>
    Task<bool> TryAutoConnectAsync();

    /// <summary>Queue an immediate sync (debounced, non-blocking).</summary>
    void NotifyDataChanged();
}
