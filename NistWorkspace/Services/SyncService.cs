using System;
using System.Collections.Generic;
using System.Linq;
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

            // --- Step 1: Pull server changes since last sync ---
            var pullResponse = await _apiClient.PullAsync(lastSync);

            if (pullResponse != null)
            {
                // Merge server months into local (server wins if newer)
                foreach (var serverMonth in pullResponse.Months)
                {
                    var localMonth = await _dataService.LoadMonthAsync(serverMonth.Year, serverMonth.Month);

                    if (localMonth == null || serverMonth.LastModifiedUtc > localMonth.LastModifiedUtc)
                    {
                        // Server is newer or local doesn't exist — save server version
                        await _dataService.SaveMonthAsync(serverMonth);
                    }
                }

                // Merge contacts (per-contact comparison by Id)
                if (pullResponse.Contacts != null && pullResponse.Contacts.Contacts.Count > 0)
                {
                    var localContacts = await _contactDataService.LoadContactsAsync();
                    var localMap = localContacts.Contacts.ToDictionary(c => c.Id);

                    foreach (var serverContact in pullResponse.Contacts.Contacts)
                    {
                        if (localMap.TryGetValue(serverContact.Id, out var local))
                        {
                            if (serverContact.LastModifiedUtc > local.LastModifiedUtc)
                            {
                                // Server is newer — replace local
                                localMap[serverContact.Id] = serverContact;
                            }
                        }
                        else
                        {
                            // New contact from server
                            localMap[serverContact.Id] = serverContact;
                        }
                    }

                    localContacts.Contacts = localMap.Values.ToList();
                    await _contactDataService.SaveContactsAsync(localContacts);
                }
            }

            // --- Step 2: Push local data to server ---
            // Server will only accept items where client timestamp is newer
            var availableMonths = await _dataService.GetAvailableMonthsAsync();
            var localMonths = new List<MonthlyData>();
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
                Settings = null,
                LastSyncedAt = lastSync
            };

            var pushResponse = await _apiClient.PushAsync(pushRequest);

            // Update last sync timestamp
            var serverTime = pushResponse?.ServerTimestamp ?? DateTime.UtcNow;
            settings = await _settingsService.LoadAsync();
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
