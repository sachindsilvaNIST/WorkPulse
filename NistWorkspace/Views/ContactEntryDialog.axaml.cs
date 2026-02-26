using Avalonia.Controls;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

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
