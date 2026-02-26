using System;
using CommunityToolkit.Mvvm.Input;

namespace NistAttendance.ViewModels;

public partial class HomeViewModel : ViewModelBase
{
    private readonly Action<string> _navigate;

    public HomeViewModel(Action<string> navigate)
    {
        _navigate = navigate;
    }

    [RelayCommand]
    private void GoToAttendance() => _navigate("attendance");

    [RelayCommand]
    private void GoToContactBook() => _navigate("contacts");
}
