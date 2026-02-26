using Avalonia.Controls;
using Avalonia.Input;

namespace NistAttendance.Views;

public partial class ContactBookDashboardView : UserControl
{
    public ContactBookDashboardView()
    {
        InitializeComponent();
    }

    private async void CopyCell_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem &&
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is SelectableTextBlock textBlock)
        {
            var clipboard = TopLevel.GetTopLevel(this)?.Clipboard;
            if (clipboard != null && !string.IsNullOrEmpty(textBlock.Text))
            {
                await clipboard.SetTextAsync(textBlock.Text);
            }
        }
    }
}
