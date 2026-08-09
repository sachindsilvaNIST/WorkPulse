using System;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

public partial class QuickLinksViewModel : ViewModelBase
{
    private readonly IQuickLinkDataService _dataService;
    private System.Collections.Generic.List<QuickLink> _links = new();

    [ObservableProperty]
    private ObservableCollection<QuickLink> _filteredLinks = new();

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private string _selectedCategory = "All";

    [ObservableProperty]
    private ObservableCollection<string> _categories = new() { "All" };

    [ObservableProperty]
    private string _statusMessage = "";

    public Func<QuickLinkEntryViewModel, Task<bool>>? ShowEntryDialog { get; set; }

    public QuickLinksViewModel(IQuickLinkDataService dataService)
    {
        _dataService = dataService;
    }

    public async Task InitializeAsync()
    {
        _links = await _dataService.LoadAllAsync();
        RefreshCategories();
        ApplyFilter();
    }

    partial void OnSearchTextChanged(string value) => ApplyFilter();
    partial void OnSelectedCategoryChanged(string value) => ApplyFilter();

    private void RefreshCategories()
    {
        var distinct = _links
            .Where(l => !string.IsNullOrWhiteSpace(l.Category))
            .Select(l => l.Category)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c);

        Categories = new ObservableCollection<string>(new[] { "All" }.Concat(distinct));
        if (!Categories.Contains(SelectedCategory)) SelectedCategory = "All";
    }

    private void ApplyFilter()
    {
        var source = _links.AsEnumerable();

        if (SelectedCategory != "All")
            source = source.Where(l => string.Equals(l.Category, SelectedCategory, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(SearchText))
            source = source.Where(l => l.SearchText.Contains(SearchText.ToLowerInvariant()));

        FilteredLinks = new ObservableCollection<QuickLink>(
            source.OrderBy(l => l.SortOrder).ThenBy(l => l.Label));
    }

    [RelayCommand]
    private void OpenLink(QuickLink? link)
    {
        if (link == null || string.IsNullOrWhiteSpace(link.Url)) return;

        try
        {
            Process.Start(new ProcessStartInfo(link.Url) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            StatusMessage = $"Could not open link: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task AddLink()
    {
        var entryVm = new QuickLinkEntryViewModel();
        if (ShowEntryDialog != null && await ShowEntryDialog(entryVm))
        {
            _links.Add(entryVm.ToRecord());
            await SaveAndRefresh();
        }
    }

    [RelayCommand]
    private async Task EditLink(QuickLink? link)
    {
        if (link == null) return;

        var entryVm = new QuickLinkEntryViewModel();
        entryVm.LoadFromRecord(link);

        if (ShowEntryDialog != null && await ShowEntryDialog(entryVm))
        {
            var updated = entryVm.ToRecord();
            var existing = _links.FirstOrDefault(l => l.Id == updated.Id);
            if (existing != null)
            {
                _links.Remove(existing);
                _links.Add(updated);
                await SaveAndRefresh();
            }
        }
    }

    [RelayCommand]
    private async Task DeleteLink(QuickLink? link)
    {
        if (link == null) return;

        var existing = _links.FirstOrDefault(l => l.Id == link.Id);
        if (existing != null)
        {
            _links.Remove(existing);
            await SaveAndRefresh();
        }
    }

    private async Task SaveAndRefresh()
    {
        await _dataService.SaveAllAsync(_links);
        RefreshCategories();
        ApplyFilter();
    }

    /// <summary>Merges freshly-parsed bookmarks in, skipping URLs already present (case-insensitive).</summary>
    public async Task ImportLinksAsync(System.Collections.Generic.List<QuickLink> imported)
    {
        var existingUrls = _links.Select(l => l.Url.TrimEnd('/').ToLowerInvariant()).ToHashSet();
        var added = 0;
        foreach (var link in imported)
        {
            var key = link.Url.TrimEnd('/').ToLowerInvariant();
            if (!existingUrls.Add(key)) continue;
            link.SortOrder = _links.Count;
            _links.Add(link);
            added++;
        }

        if (added > 0) await SaveAndRefresh();
        StatusMessage = added > 0 ? $"Imported {added} bookmark(s)." : "No new bookmarks found (all already imported).";
    }
}
