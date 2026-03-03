using System.Reflection;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Styling;
using CommunityToolkit.Mvvm.ComponentModel;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class SettingsViewModel : ViewModelBase
{
    private readonly ISettingsService _settingsService;
    private AppSettings _settings = new();

    [ObservableProperty]
    private bool _isDarkTheme;

    [ObservableProperty]
    private int _fontSizeIndex = 1; // 0=Small, 1=Medium, 2=Large

    [ObservableProperty]
    private string _statusMessage = "";

    public string[] FontSizeOptions { get; } = { "Small", "Medium", "Large" };

    public string VersionDisplay { get; } =
        $"NIST Workspace v{Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0"}";

    public SettingsViewModel(ISettingsService settingsService)
    {
        _settingsService = settingsService;
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

    private async Task SaveSettingsAsync()
    {
        await _settingsService.SaveAsync(_settings);
        StatusMessage = "Settings saved.";
    }
}
