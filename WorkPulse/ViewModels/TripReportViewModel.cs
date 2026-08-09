using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

public partial class TripReportViewModel : ViewModelBase
{
    private readonly ITripReportDataService _dataService;
    private List<TripReport> _reports = new();

    [ObservableProperty]
    private ObservableCollection<TripReport> _filteredReports = new();

    [ObservableProperty]
    private TripReport? _selectedReport;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private int _totalReports;

    [ObservableProperty]
    private bool _hasNoReports;

    [ObservableProperty]
    private string _statusMessage = "Ready";

    [ObservableProperty]
    private bool _isEditMode;

    [ObservableProperty]
    private string _editModeButtonText = "Edit";

    public TripReportViewModel(ITripReportDataService dataService)
    {
        _dataService = dataService;
    }

    public async Task InitializeAsync()
    {
        _reports = await _dataService.LoadAllAsync();
        ApplyFilter();
    }

    partial void OnSearchTextChanged(string value) => ApplyFilter();

    private void ApplyFilter()
    {
        var selectedId = SelectedReport?.Id;

        var source = string.IsNullOrWhiteSpace(SearchText)
            ? _reports.AsEnumerable()
            : _reports.Where(r => r.SearchText.Contains(SearchText.ToLowerInvariant()));

        FilteredReports = new ObservableCollection<TripReport>(source.OrderByDescending(r => r.StartDate));
        TotalReports = FilteredReports.Count;
        HasNoReports = FilteredReports.Count == 0;

        if (selectedId != null)
        {
            var match = FilteredReports.FirstOrDefault(r => r.Id == selectedId);
            if (match != null) SelectedReport = match;
        }
    }

    [RelayCommand]
    private void ClearSearch() => SearchText = "";

    [RelayCommand]
    private void ToggleEditMode()
    {
        IsEditMode = !IsEditMode;
        EditModeButtonText = IsEditMode ? "Done" : "Edit";
        StatusMessage = IsEditMode
            ? "EDIT MODE - Add, modify, or delete business trip reports."
            : "View mode.";
    }

    public async Task AddReport(TripReport report)
    {
        _reports.Add(report);
        await SaveAndRefresh();
        StatusMessage = $"Added trip: {report.Destination}";
    }

    public async Task UpdateReport(TripReport updated)
    {
        var existing = _reports.FirstOrDefault(r => r.Id == updated.Id);
        if (existing == null) return;

        _reports.Remove(existing);
        _reports.Add(updated);
        await SaveAndRefresh();
        StatusMessage = $"Updated trip: {updated.Destination}";
    }

    public async Task DeleteReport(TripReport report)
    {
        var existing = _reports.FirstOrDefault(r => r.Id == report.Id);
        if (existing == null) return;

        _reports.Remove(existing);
        await SaveAndRefresh();
        SelectedReport = null;
        StatusMessage = $"Deleted trip: {report.Destination}";
    }

    private async Task SaveAndRefresh()
    {
        await _dataService.SaveAllAsync(_reports);
        ApplyFilter();
    }
}
