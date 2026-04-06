using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WorkPulse.DTOs;
using WorkPulse.Models;

namespace WorkPulse.Services;

public class SyncService : ISyncService, IDisposable
{
    private readonly IDataService _dataService;
    private readonly IContactDataService _contactDataService;
    private readonly ISettingsService _settingsService;
    private readonly HttpApiClient _apiClient;
    private readonly string _logPath;

    private bool _isSyncing;
    private Timer? _autoSyncTimer;
    private Timer? _debounceTimer;

    public bool IsLoggedIn => _apiClient.IsAuthenticated;
    public bool IsSyncing => _isSyncing;
    public string? LastError { get; private set; }

    public event Action<bool>? SyncCompleted;
    public event Action? SyncStarted;

    public SyncService(
        IDataService dataService,
        IContactDataService contactDataService,
        ISettingsService settingsService,
        HttpApiClient apiClient)
    {
        _dataService = dataService;
        _contactDataService = contactDataService;
        _settingsService = settingsService;
        _apiClient = apiClient;

        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var folder = Path.Combine(appData, "WorkPulse");
        Directory.CreateDirectory(folder);
        _logPath = Path.Combine(folder, "sync.log");
    }

    private void Log(string message)
    {
        try
        {
            var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}";
            File.AppendAllText(_logPath, line + Environment.NewLine);
        }
        catch { /* ignore logging failures */ }
    }

    public async Task<(bool Success, string? Error)> LoginAsync(string serverUrl, string email, string password)
    {
        try
        {
            Log($"LOGIN: Connecting to {serverUrl} as {email}");
            _apiClient.SetBaseUrl(serverUrl);
            var (success, auth, error) = await _apiClient.LoginAsync(email, password);

            if (!success)
            {
                Log($"LOGIN FAILED: {error}");
                return (false, error);
            }

            Log($"LOGIN OK: Token received, display name: {auth?.DisplayName}");

            // Persist sync config + tokens
            var settings = await _settingsService.LoadAsync();
            settings.SyncEnabled = true;
            settings.SyncServerUrl = serverUrl;
            settings.SyncEmail = email;
            settings.SyncToken = auth?.Token;
            settings.SyncRefreshToken = auth?.RefreshToken;
            await _settingsService.SaveAsync(settings);

            // Start auto-sync after successful login
            StartAutoSync();

            return (true, null);
        }
        catch (Exception ex)
        {
            Log($"LOGIN ERROR: {ex}");
            return (false, $"Connection failed: {ex.Message}");
        }
    }

    public async Task LogoutAsync()
    {
        Log("LOGOUT");
        StopAutoSync();
        _apiClient.ClearTokens();
        var settings = await _settingsService.LoadAsync();
        settings.SyncEnabled = false;
        settings.SyncToken = null;
        settings.SyncRefreshToken = null;
        await _settingsService.SaveAsync(settings);
    }

    public async Task<bool> TryAutoConnectAsync()
    {
        try
        {
            var settings = await _settingsService.LoadAsync();
            if (!settings.SyncEnabled
                || string.IsNullOrEmpty(settings.SyncServerUrl)
                || string.IsNullOrEmpty(settings.SyncToken)
                || string.IsNullOrEmpty(settings.SyncRefreshToken))
                return false;

            Log($"AUTO-CONNECT: Restoring session for {settings.SyncEmail} at {settings.SyncServerUrl}");
            _apiClient.SetBaseUrl(settings.SyncServerUrl);
            _apiClient.SetTokens(settings.SyncToken, settings.SyncRefreshToken);

            // Verify the token still works by attempting a pull
            try
            {
                await _apiClient.PullAsync(settings.LastSyncedAtUtc);
                Log("AUTO-CONNECT: Token valid, starting auto-sync");
                StartAutoSync();
                return true;
            }
            catch
            {
                // Token expired — try refresh
                Log("AUTO-CONNECT: Token expired, attempting refresh...");
                var (refreshed, error) = await _apiClient.RefreshTokenAsync();
                if (refreshed)
                {
                    // Save new tokens
                    settings.SyncToken = _apiClient.CurrentToken;
                    settings.SyncRefreshToken = _apiClient.CurrentRefreshToken;
                    await _settingsService.SaveAsync(settings);
                    Log("AUTO-CONNECT: Token refreshed, starting auto-sync");
                    StartAutoSync();
                    return true;
                }

                Log($"AUTO-CONNECT: Refresh failed — {error}. User needs to re-login.");
                _apiClient.ClearTokens();
                settings.SyncToken = null;
                settings.SyncRefreshToken = null;
                await _settingsService.SaveAsync(settings);
                return false;
            }
        }
        catch (Exception ex)
        {
            Log($"AUTO-CONNECT ERROR: {ex.Message}");
            return false;
        }
    }

    public void StartAutoSync(int intervalSeconds = 5)
    {
        Log($"AUTO-SYNC: Starting with {intervalSeconds}s interval");
        StopAutoSync();
        _autoSyncTimer = new Timer(
            _ => _ = SyncInBackground(),
            null,
            TimeSpan.FromSeconds(5),
            TimeSpan.FromSeconds(intervalSeconds));
    }

    public void StopAutoSync()
    {
        _autoSyncTimer?.Dispose();
        _autoSyncTimer = null;
        _debounceTimer?.Dispose();
        _debounceTimer = null;
    }

    public void NotifyDataChanged()
    {
        if (!IsLoggedIn) return;

        _debounceTimer?.Dispose();
        _debounceTimer = new Timer(
            _ => _ = SyncInBackground(),
            null,
            TimeSpan.FromSeconds(2),
            Timeout.InfiniteTimeSpan);
    }

    private async Task SyncInBackground()
    {
        SyncStarted?.Invoke();
        var (success, _) = await SyncAsync();
        SyncCompleted?.Invoke(success);
    }

    public async Task<(bool Success, string? Error)> SyncAsync()
    {
        if (!IsLoggedIn)
        {
            Log("SYNC SKIP: Not logged in");
            return (false, "Not logged in");
        }

        if (_isSyncing)
            return (false, "Sync already in progress");

        _isSyncing = true;
        LastError = null;

        try
        {
            var settings = await _settingsService.LoadAsync();
            var lastSync = settings.LastSyncedAtUtc;
            Log($"SYNC START: lastSync={lastSync:O}");

            // --- Step 1: Pull server changes since last sync ---
            Log("PULL: Requesting server changes...");
            var pullResponse = await _apiClient.PullAsync(lastSync);
            Log($"PULL OK: {pullResponse?.Months.Count ?? 0} months, {pullResponse?.Contacts?.Contacts.Count ?? 0} contacts");

            if (pullResponse != null)
            {
                foreach (var serverMonth in pullResponse.Months)
                {
                    var localMonth = await _dataService.LoadMonthAsync(serverMonth.Year, serverMonth.Month);

                    if (localMonth == null || serverMonth.LastModifiedUtc > localMonth.LastModifiedUtc)
                    {
                        Log($"PULL MERGE: {serverMonth.Year}-{serverMonth.Month:D2} ({serverMonth.Records.Count} records) — server is newer");
                        await _dataService.SaveMonthAsync(serverMonth);
                    }
                }

                if (pullResponse.Contacts != null && pullResponse.Contacts.Contacts.Count > 0)
                {
                    var localContacts = await _contactDataService.LoadContactsAsync();
                    var localMap = localContacts.Contacts.ToDictionary(c => c.Id);

                    foreach (var serverContact in pullResponse.Contacts.Contacts)
                    {
                        if (localMap.TryGetValue(serverContact.Id, out var local))
                        {
                            if (serverContact.LastModifiedUtc > local.LastModifiedUtc)
                                localMap[serverContact.Id] = serverContact;
                        }
                        else
                        {
                            localMap[serverContact.Id] = serverContact;
                        }
                    }

                    localContacts.Contacts = localMap.Values.ToList();
                    await _contactDataService.SaveContactsAsync(localContacts);
                    Log($"PULL MERGE: {pullResponse.Contacts.Contacts.Count} contacts merged");
                }
            }

            // --- Step 2: Push local data to server ---
            var availableMonths = await _dataService.GetAvailableMonthsAsync();
            var localMonths = new List<MonthlyData>();
            foreach (var (year, month) in availableMonths)
            {
                var data = await _dataService.LoadMonthAsync(year, month);
                if (data != null)
                    localMonths.Add(data);
            }

            var contacts = await _contactDataService.LoadContactsAsync();

            Log($"PUSH: Sending {localMonths.Count} months, {contacts.Contacts.Count} contacts...");

            var pushRequest = new SyncRequest
            {
                Months = localMonths,
                Contacts = contacts,
                Settings = null,
                LastSyncedAt = lastSync
            };

            var pushResponse = await _apiClient.PushAsync(pushRequest);
            Log($"PUSH OK: serverTimestamp={pushResponse?.ServerTimestamp:O}");

            // Update last sync timestamp + persist latest tokens
            var serverTime = pushResponse?.ServerTimestamp ?? DateTime.UtcNow;
            settings = await _settingsService.LoadAsync();
            settings.LastSyncedAtUtc = serverTime;
            settings.SyncToken = _apiClient.CurrentToken;
            settings.SyncRefreshToken = _apiClient.CurrentRefreshToken;
            await _settingsService.SaveAsync(settings);

            Log("SYNC COMPLETE: Success");
            return (true, null);
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            Log($"SYNC ERROR: {ex}");
            return (false, ex.Message);
        }
        finally
        {
            _isSyncing = false;
        }
    }

    public void Dispose()
    {
        StopAutoSync();
        _apiClient.Dispose();
    }
}
