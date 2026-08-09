using System.Linq;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using WorkPulse.Models;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class TripDocumentsWindow : Window
{
    public TripDocumentsWindow()
    {
        InitializeComponent();
    }

    public TripDocumentsWindow(TripDocumentsViewModel viewModel) : this()
    {
        DataContext = viewModel;
        Title = $"Documents — {viewModel.TripDisplayName}";

        viewModel.ShowOpenFileDialog = ShowOpenFileDialogAsync;
        viewModel.ShowSaveFileDialog = ShowSaveFileDialogAsync;
        viewModel.ShowConfirmDialog = ShowConfirmDialogAsync;

        Loaded += async (_, _) => await viewModel.InitializeAsync();
    }

    private async Task<string?> ShowOpenFileDialogAsync()
    {
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Select Document",
            AllowMultiple = false
        });

        return files.FirstOrDefault()?.Path.LocalPath;
    }

    private async Task<string?> ShowSaveFileDialogAsync(string suggestedName)
    {
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Save Document",
            SuggestedFileName = suggestedName
        });

        return file?.Path.LocalPath;
    }

    private async Task<bool> ShowConfirmDialogAsync(string title, string message)
    {
        var dialog = new Window
        {
            Title = title,
            Width = 380,
            Height = 160,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        var result = false;
        var panel = new StackPanel { Margin = new Avalonia.Thickness(20), Spacing = 16 };
        panel.Children.Add(new TextBlock { Text = message, TextWrapping = Avalonia.Media.TextWrapping.Wrap });

        var buttonPanel = new StackPanel
        {
            Orientation = Avalonia.Layout.Orientation.Horizontal,
            HorizontalAlignment = Avalonia.Layout.HorizontalAlignment.Right,
            Spacing = 8
        };

        var cancelBtn = new Button { Content = "Cancel", Padding = new Avalonia.Thickness(16, 6) };
        cancelBtn.Click += (_, _) => { result = false; dialog.Close(); };

        var okBtn = new Button
        {
            Content = "Delete",
            Padding = new Avalonia.Thickness(16, 6),
            Background = Avalonia.Media.Brushes.Firebrick,
            Foreground = Avalonia.Media.Brushes.White
        };
        okBtn.Click += (_, _) => { result = true; dialog.Close(); };

        buttonPanel.Children.Add(cancelBtn);
        buttonPanel.Children.Add(okBtn);
        panel.Children.Add(buttonPanel);

        dialog.Content = panel;
        await dialog.ShowDialog(this);
        return result;
    }

    private void DownloadButton_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is TripDocumentsViewModel vm && sender is Button { Tag: TripDocumentMeta doc })
            vm.DownloadCommand.Execute(doc);
    }

    private void DeleteButton_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is TripDocumentsViewModel vm && sender is Button { Tag: TripDocumentMeta doc })
            vm.DeleteCommand.Execute(doc);
    }
}
