using Avalonia.Controls;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class QuickLinkEntryDialog : Window
{
    public QuickLinkEntryDialog()
    {
        InitializeComponent();
    }

    public QuickLinkEntryDialog(QuickLinkEntryViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.CloseAction = Close;
    }
}
