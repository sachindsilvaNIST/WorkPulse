using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class FileSearchView : UserControl
{
    public FileSearchView()
    {
        InitializeComponent();

        var grid = this.FindControl<DataGrid>("ResultsGrid");
        if (grid != null)
        {
            grid.DoubleTapped += OnGridDoubleTapped;
        }
    }

    protected override void OnDataContextChanged(EventArgs e)
    {
        base.OnDataContextChanged(e);

        if (DataContext is FileSearchViewModel vm)
        {
            vm.OpenFileAction = OpenFileAsync;
            vm.OpenFolderAction = OpenFolderAsync;
            vm.CopyToClipboardAction = CopyToClipboardAsync;
        }
    }

    private async void OnGridDoubleTapped(object? sender, TappedEventArgs e)
    {
        if (DataContext is FileSearchViewModel vm && vm.SelectedResult != null)
        {
            await OpenFolderAsync(vm.SelectedResult.DirectoryPath);
        }
    }

    private void OpenFile_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is FileSearchViewModel vm)
            vm.OpenFileCommand.Execute(null);
    }

    private void OpenFolder_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is FileSearchViewModel vm)
            vm.OpenContainingFolderCommand.Execute(null);
    }

    private void CopyPath_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is FileSearchViewModel vm)
            vm.CopyPathCommand.Execute(null);
    }

    private Task OpenFileAsync(string filePath)
    {
        try
        {
            if (File.Exists(filePath))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = filePath,
                    UseShellExecute = true
                });
            }
        }
        catch { }
        return Task.CompletedTask;
    }

    private Task OpenFolderAsync(string folderPath)
    {
        try
        {
            if (Directory.Exists(folderPath))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = folderPath,
                    UseShellExecute = true
                });
            }
        }
        catch { }
        return Task.CompletedTask;
    }

    private async Task CopyToClipboardAsync(string text)
    {
        var clipboard = TopLevel.GetTopLevel(this)?.Clipboard;
        if (clipboard != null)
        {
            await clipboard.SetTextAsync(text);
        }
    }
}
