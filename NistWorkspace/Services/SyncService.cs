using System;
using System.Threading.Tasks;
using NistAttendance.DTOs;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class SyncService : ISyncService
{
    private readonly IDataService _dataService;
    private readonly IContactDataService _contactDataService;
    private readonly ISettingsService _settingsService;
    private readonly HttpApiClient _apiClient;

    private bool _isSyncing;

    public bool IsLoggedIn => _apiClient.IsAuthenticated;
    public bool IsSyncing => _isSyncing;
    public string? LastError { get; private set; }

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
    }

    public async Task<(bool Success, string? Error)> LoginAsync(string serverUrl, string email, string password)
    {
        try
        {
            _apiClient.SetBaseUrl(serverUrl);
            var (success, auth, error) = await _apiClient.LoginAsync(email, password);

            if (!success)
                return (false, error);

            // Persist sync config
            var settings = await _settingsService.LoadAsync();
            settings.SyncEnabled = true;
            settings.SyncServerUrl = serverUrl;
            settings.SyncEmail = email;
            await _settingsService.SaveAsync(settings);

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, $"Connection failed: {ex.Message}");
        }
    }

    public async Task LogoutAsync()
    {
        _apiClient.ClearTokens();
        var settings = await _settingsService.LoadAsync();
        settings.SyncEnabled = false;
        await _settingsService.SaveAsync(settings);
    }

    public async Task<(bool Success, string? Error)> SyncAsync()
    {
        if (!IsLoggedIn)
            return (false, "Not logged in");

        if (_isSyncing)
            return (false, "Sync already in progress");

        _isSyncing = true;
        LastError = null;

        try
        {
            var settings = await _settingsService.LoadAsync();
            var lastSync = settings.LastSyncedAtUtc;

            // --- Push local data to server ---
            var availableMonths = await _dataService.GetAvailableMonthsAsync();
            var localMonths = new System.Collections.Generic.List<MonthlyData>();
            foreach (var (year, month) in availableMonths)
            {
                var data = await _dataService.LoadMonthAsync(year, month);
                if (data != null)
                    localMonths.Add(data);
            }

            var contacts = await _contactDataService.LoadContactsAsync();

            var pushRequest = new SyncRequest
            {
                Months = localMonths,
                Contacts = contacts,
                Settings = null, // Don't push desktop-only settings to server
                LastSyncedAt = lastSync
            };

            var pushResponse = await _apiClient.PushAsync(pushRequest);

            // --- Pull server data (anything newer than our last sync) ---
            var pullResponse = await _apiClient.PullAsync(lastSync);

            if (pullResponse != null)
            {
                // Merge server months into local (server wins for newer data)
                foreach (var serverMonth in pullResponse.Months)
                {
                    await _dataService.SaveMonthAsync(serverMonth);
                }

                // Merge contacts (replace with server version)
                if (pullResponse.Contacts != null && pullResponse.Contacts.Contacts.Count > 0)
                {
                    await _contactDataService.SaveContactsAsync(pullResponse.Contacts);
                }
            }

            // Update last sync timestamp
            var serverTime = pushResponse?.ServerTimestamp ?? DateTime.UtcNow;
            settings.LastSyncedAtUtc = serverTime;
            await _settingsService.SaveAsync(settings);

            return (true, null);
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            return (false, ex.Message);
        }
        finally
        {
            _isSyncing = false;
        }
    }
}
