using Avalonia.Controls;
using NistAttendance.Models;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class AttendanceEntryDialog : Window
{
    public AttendanceEntryDialog()
    {
        InitializeComponent();

        // Populate DayType combo
        DayTypeCombo.Items.Clear();
        DayTypeCombo.Items.Add(new ComboBoxItem { Content = "Work Day" });
        DayTypeCombo.Items.Add(new ComboBoxItem { Content = "Annual Paid Leave: 年休" });
        DayTypeCombo.Items.Add(new ComboBoxItem { Content = "Unpaid Leave: 休み" });
        DayTypeCombo.Items.Add(new ComboBoxItem { Content = "Public Holiday: 休日" });
        DayTypeCombo.Items.Add(new ComboBoxItem { Content = "Weekend: 土・日曜日" });
    }

    public AttendanceEntryDialog(AttendanceEntryViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.CloseAction = Close;

        // Set initial DayType combo selection
        DayTypeCombo.SelectedIndex = viewModel.DayType switch
        {
            DayType.WorkDay => 0,
            DayType.AnnualPaidLeave => 1,
            DayType.UnpaidLeave => 2,
            DayType.PublicHoliday => 3,
            DayType.Weekend => 4,
            _ => 0
        };

        // Sync DayType combo changes to ViewModel
        DayTypeCombo.SelectionChanged += (_, _) =>
        {
            viewModel.DayType = DayTypeCombo.SelectedIndex switch
            {
                0 => DayType.WorkDay,
                1 => DayType.AnnualPaidLeave,
                2 => DayType.UnpaidLeave,
                3 => DayType.PublicHoliday,
                4 => DayType.Weekend,
                _ => DayType.WorkDay
            };
        };

        // Set initial OT selection
        if (viewModel.OvertimeSelection >= 0)
        {
            OtCombo.SelectedIndex = viewModel.OvertimeSelection == 1 ? 0 : 1; // 0=Yes, 1=No in combo
        }

        // Sync OT combo changes
        OtCombo.SelectionChanged += (_, _) =>
        {
            if (OtCombo.SelectedIndex == 0)
                viewModel.OvertimeSelection = 1; // Yes
            else if (OtCombo.SelectedIndex == 1)
                viewModel.OvertimeSelection = 0; // No
        };
    }
}
