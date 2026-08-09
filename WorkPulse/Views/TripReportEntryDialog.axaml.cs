using Avalonia.Controls;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class TripReportEntryDialog : Window
{
    public TripReportEntryDialog()
    {
        InitializeComponent();
    }

    public TripReportEntryDialog(TripReportEntryViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.CloseAction = Close;
    }
}
