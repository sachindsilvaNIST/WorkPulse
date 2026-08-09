using System;
using System.Reflection;
using CommunityToolkit.Mvvm.Input;

namespace WorkPulse.ViewModels;

public partial class HomeViewModel : ViewModelBase
{
    private readonly Action<string> _navigate;
    private readonly Action _openQuickLinks;
    private readonly Action _openReimbursement;
    private readonly Action _openBookmarkLibrary;

    public string VersionDisplay { get; } =
        $"v{Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0"}";

    public HomeViewModel(Action<string> navigate, Action openQuickLinks, Action openReimbursement, Action openBookmarkLibrary)
    {
        _navigate = navigate;
        _openQuickLinks = openQuickLinks;
        _openReimbursement = openReimbursement;
        _openBookmarkLibrary = openBookmarkLibrary;
    }

    [RelayCommand]
    private void GoToQuickLinks() => _openQuickLinks();

    [RelayCommand]
    private void GoToReimbursement() => _openReimbursement();

    [RelayCommand]
    private void GoToBookmarkLibrary() => _openBookmarkLibrary();

    [RelayCommand]
    private void GoToAttendance() => _navigate("attendance");

    [RelayCommand]
    private void GoToContactBook() => _navigate("contacts");

    [RelayCommand]
    private void GoToDailyReports() => _navigate("dailyreports");

    [RelayCommand]
    private void GoToWeeklyReports() => _navigate("weeklyreports");

    [RelayCommand]
    private void GoToTripReports() => _navigate("tripreports");

    [RelayCommand]
    private void GoToSettings() => _navigate("settings");
}
