using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Interactivity;
using WorkPulse.Models;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class QuickLinksWindow : Window
{
    public QuickLinksWindow()
    {
        InitializeComponent();
    }

    public QuickLinksWindow(QuickLinksViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.ShowEntryDialog = ShowEntryDialogAsync;
    }

    private async Task<bool> ShowEntryDialogAsync(QuickLinkEntryViewModel entryVm)
    {
        var dialog = new QuickLinkEntryDialog(entryVm);
        await dialog.ShowDialog(this);
        return entryVm.DialogResult;
    }

    private void LinkButton_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is QuickLinksViewModel vm && sender is Button { Tag: QuickLink link })
            vm.OpenLinkCommand.Execute(link);
    }

    private void EditLink_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is QuickLinksViewModel vm && sender is MenuItem { Tag: QuickLink link })
            vm.EditLinkCommand.Execute(link);
    }

    private void DeleteLink_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is QuickLinksViewModel vm && sender is MenuItem { Tag: QuickLink link })
            vm.DeleteLinkCommand.Execute(link);
    }
}
