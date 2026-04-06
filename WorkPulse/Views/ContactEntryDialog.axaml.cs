using Avalonia.Controls;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class ContactEntryDialog : Window
{
    public ContactEntryDialog()
    {
        InitializeComponent();
    }

    public ContactEntryDialog(ContactEntryViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.CloseAction = Close;
    }
}
