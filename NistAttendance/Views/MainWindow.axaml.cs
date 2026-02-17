using System.Linq;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Platform.Storage;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();

        Loaded += async (_, _) =>
        {
            if (DataContext is MainWindowViewModel vm)
            {
                vm.ShowOpenFileDialog = ShowOpenFileDialogAsync;
                vm.ShowSaveFileDialog = ShowSaveFileDialogAsync;
                vm.ShowEditDialog = ShowEditDialogAsync;
                vm.ShowConfirmDialog = ShowConfirmDialogAsync;
                await vm.InitializeAsync();
            }
        };
    }

    private async Task<string?> ShowOpenFileDialogAsync()
    {
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Select Excel File",
            AllowMultiple = false,
            FileTypeFilter = new[]
            {
                new FilePickerFileType("Excel Files") { Patterns = new[] { "*.xlsx" } },
                new FilePickerFileType("All Files") { Patterns = new[] { "*" } }
            }
        });

        return files.FirstOrDefault()?.Path.LocalPath;
    }

    private async Task<string?> ShowSaveFileDialogAsync(string suggestedName)
    {
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Export to Excel",
            DefaultExtension = "xlsx",
            SuggestedFileName = $"{suggestedName}.xlsx",
            FileTypeChoices = new[]
            {
                new FilePickerFileType("Excel Files") { Patterns = new[] { "*.xlsx" } }
            }
        });

        return file?.Path.LocalPath;
    }

    private async Task<bool> ShowEditDialogAsync(AttendanceEntryViewModel entryVm)
    {
        var dialog = new AttendanceEntryDialog(entryVm);
        await dialog.ShowDialog(this);
        return entryVm.DialogResult;
    }

    private async Task<bool> ShowConfirmDialogAsync(string title, string message)
    {
        var dialog = new Window
        {
            Title = title,
            Width = 350,
            Height = 160,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        var result = false;

        var panel = new StackPanel { Margin = new Thickness(20), Spacing = 16 };
        panel.Children.Add(new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap });

        var buttonPanel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
            Spacing = 8
        };

        var cancelBtn = new Button { Content = "Cancel", Padding = new Thickness(16, 6) };
        cancelBtn.Click += (_, _) => { result = false; dialog.Close(); };

        var okBtn = new Button { Content = "Delete", Padding = new Thickness(16, 6) };
        okBtn.Click += (_, _) => { result = true; dialog.Close(); };

        buttonPanel.Children.Add(cancelBtn);
        buttonPanel.Children.Add(okBtn);
        panel.Children.Add(buttonPanel);

        dialog.Content = panel;
        await dialog.ShowDialog(this);
        return result;
    }
}
