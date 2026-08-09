using System;
using System.IO;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using WorkPulse.Models;
using WorkPulse.Utilities;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class BookmarkLibraryWindow : Window
{
    public BookmarkLibraryWindow()
    {
        InitializeComponent();
    }

    public BookmarkLibraryWindow(QuickLinksViewModel viewModel) : this()
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

    private void OpenCard_Click(object? sender, RoutedEventArgs e)
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

    private Button? _selectedChip;

    private void CategoryChip_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not QuickLinksViewModel vm || sender is not Button { Tag: string category } chip) return;

        vm.SelectedCategory = category;
        _selectedChip?.Classes.Remove("selected");
        chip.Classes.Add("selected");
        _selectedChip = chip;
    }

    private async void ImportButton_Click(object? sender, RoutedEventArgs e)
    {
        if (DataContext is not QuickLinksViewModel vm) return;

        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Select Chrome/browser bookmarks export (HTML)",
            AllowMultiple = false,
            FileTypeFilter = new[]
            {
                new FilePickerFileType("Bookmarks HTML") { Patterns = new[] { "*.html", "*.htm" } }
            }
        });

        var file = files.Count > 0 ? files[0] : null;
        if (file == null) return;

        try
        {
            await using var stream = await file.OpenReadAsync();
            using var reader = new StreamReader(stream);
            var html = await reader.ReadToEndAsync();
            var imported = BookmarkImportParser.Parse(html);
            await vm.ImportLinksAsync(imported);
        }
        catch (Exception ex)
        {
            vm.StatusMessage = $"Import failed: {ex.Message}";
        }
    }
}
