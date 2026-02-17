using Avalonia.Controls;
using NistAttendance.Models;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class AttendanceEntryDialog : Window
{
    public AttendanceEntryDialog()
    {
        InitializeComponent();
    }

    public AttendanceEntryDialog(AttendanceEntryViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.CloseAction = Close;

        // Set initial combo box selection based on view model
        DayTypeCombo.SelectedIndex = viewModel.DayType switch
        {
            DayType.WorkDay => 0,
            DayType.Holiday => 1,
            DayType.RestDay => 2,
            DayType.Absent => 3,
            _ => 0
        };

        // Sync combo box changes back to view model
        DayTypeCombo.SelectionChanged += (_, _) =>
        {
            viewModel.DayType = DayTypeCombo.SelectedIndex switch
            {
                0 => DayType.WorkDay,
                1 => DayType.Holiday,
                2 => DayType.RestDay,
                3 => DayType.Absent,
                _ => DayType.WorkDay
            };
        };
    }
}
