using System.Threading.Tasks;

namespace NistAttendance.Services;

public interface ISyncService
{
    bool IsLoggedIn { get; }
    bool IsSyncing { get; }
    string? LastError { get; }
    Task<(bool Success, string? Error)> LoginAsync(string serverUrl, string email, string password);
    Task LogoutAsync();
    Task<(bool Success, string? Error)> SyncAsync();
}
