using System;
using System.Reflection;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Styling;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    private readonly ISettingsService _settingsService;
    private readonly ISyncService _syncService;
    private AppSettings _settings = new();

    [ObservableProperty]
    private bool _isDarkTheme;

    [ObservableProperty]
    private int _fontSizeIndex = 1; // 0=Small, 1=Medium, 2=Large

    [ObservableProperty]
    private string _statusMessage = "";

    // Sync fields
    [ObservableProperty]
    private string _syncServerUrl = "";

    [ObservableProperty]
    private string _syncEmail = "";

    [ObservableProperty]
    private string _syncPassword = "";

    [ObservableProperty]
    private bool _isSyncLoggedIn;

    [ObservableProperty]
    private bool _isSyncing;

    [ObservableProperty]
    private string _syncStatusMessage = "";

    [ObservableProperty]
    private string _lastSyncDisplay = "Never";

    public string[] FontSizeOptions { get; } = { "Small", "Medium", "Large" };

    public string VersionDisplay { get; } =
        $"NIST Workspace v{Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0"}";

    public SettingsViewModel(ISettingsService settingsService, ISyncService syncService)
    {
        _settingsService = settingsService;
        _syncService = syncService;

        // Listen for background sync completions
        _syncService.SyncCompleted += OnSyncCompleted;
    }

    private async void OnSyncCompleted(bool success)
    {
        _settings = await _settingsService.LoadAsync();
        UpdateLastSyncDisplay();
        if (success)
            SyncStatusMessage = "Auto-synced.";
    }

    public async Task InitializeAsync()
    {
        _settings = await _settingsService.LoadAsync();
        IsDarkTheme = _settings.ThemeVariant == "Dark";
        FontSizeIndex = _settings.FontSizePreset switch
        {
            "Small" => 0,
            "Large" => 2,
            _ => 1
        };

        // Sync state
        SyncServerUrl = _settings.SyncServerUrl;
        SyncEmail = _settings.SyncEmail;
        IsSyncLoggedIn = _syncService.IsLoggedIn;
        UpdateLastSyncDisplay();
    }

    partial void OnIsDarkThemeChanged(bool value)
    {
        var variant = value ? ThemeVariant.Dark : ThemeVariant.Light;
        Application.Current!.RequestedThemeVariant = variant;
        _settings.ThemeVariant = value ? "Dark" : "Light";
        _ = SaveSettingsAsync();
    }

    partial void OnFontSizeIndexChanged(int value)
    {
        if (value < 0 || value >= FontSizeOptions.Length) return;
        _settings.FontSizePreset = FontSizeOptions[value];
        double size = FontSizeOptions[value] switch
        {
            "Small" => 12.0,
            "Large" => 16.0,
            _ => 14.0
        };
        Application.Current!.Resources["DefaultFontSize"] = size;
        _ = SaveSettingsAsync();
    }

    [RelayCommand]
    private async Task SyncLogin()
    {
        if (string.IsNullOrWhiteSpace(SyncServerUrl) || string.IsNullOrWhiteSpace(SyncEmail) || string.IsNullOrWhiteSpace(SyncPassword))
        {
            SyncStatusMessage = "Please fill in server URL, email, and password.";
            return;
        }

        SyncStatusMessage = "Connecting...";
        var (success, error) = await _syncService.LoginAsync(SyncServerUrl.Trim(), SyncEmail.Trim(), SyncPassword.Trim());

        if (success)
        {
            IsSyncLoggedIn = true;
            SyncPassword = "";
            SyncStatusMessage = "Connected! Auto-sync is active.";
        }
        else
        {
            SyncStatusMessage = error ?? "Login failed.";
        }
    }

    [RelayCommand]
    private async Task SyncLogout()
    {
        await _syncService.LogoutAsync();
        IsSyncLoggedIn = false;
        SyncStatusMessage = "Disconnected.";
    }

    [RelayCommand]
    private async Task SyncNow()
    {
        IsSyncing = true;
        SyncStatusMessage = "Syncing...";

        var (success, error) = await _syncService.SyncAsync();

        if (success)
        {
            SyncStatusMessage = "Sync completed.";
            _settings = await _settingsService.LoadAsync();
            UpdateLastSyncDisplay();
        }
        else
        {
            SyncStatusMessage = $"Sync failed: {error}";
        }

        IsSyncing = false;
    }

    private void UpdateLastSyncDisplay()
    {
        LastSyncDisplay = _settings.LastSyncedAtUtc == DateTime.MinValue
            ? "Never"
            : _settings.LastSyncedAtUtc.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
    }

    private async Task SaveSettingsAsync()
    {
        await _settingsService.SaveAsync(_settings);
        StatusMessage = "Settings saved.";
    }
}
