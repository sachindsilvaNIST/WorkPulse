using System;
using System.Reflection;
using CommunityToolkit.Mvvm.Input;

namespace NistAttendance.ViewModels;

public partial class HomeViewModel : ViewModelBase
{
    private readonly Action<string> _navigate;

    public string VersionDisplay { get; } =
        $"v{Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0"}";

    public HomeViewModel(Action<string> navigate)
    {
        _navigate = navigate;
    }

    [RelayCommand]
    private void GoToAttendance() => _navigate("attendance");

    [RelayCommand]
    private void GoToContactBook() => _navigate("contacts");

    [RelayCommand]
    private void GoToFileSearch() => _navigate("search");

    [RelayCommand]
    private void GoToSettings() => _navigate("settings");
}
