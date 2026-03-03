using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class DashboardViewModel : ViewModelBase
{
    private readonly IDataService _dataService;

    [ObservableProperty]
    private int _selectedYear;

    [ObservableProperty]
    private int _selectedMonth;

    [ObservableProperty]
    private string _monthYearDisplay = "";

    [ObservableProperty]
    private ObservableCollection<AttendanceRecord> _records = new();

    [ObservableProperty]
    private int _totalWorkDays;

    [ObservableProperty]
    private int _overtimeCount;

    [ObservableProperty]
    private string _totalOvertimeDuration = "0 Hr 0 Min";

    [ObservableProperty]
    private string _statusMessage = "Ready";

    [ObservableProperty]
    private AttendanceRecord? _selectedRecord;

    [ObservableProperty]
    private bool _isEditMode;

    [ObservableProperty]
    private string _editModeButtonText = "Edit";

    [ObservableProperty]
    private bool _hasUnsavedChanges;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private ObservableCollection<AttendanceRecord> _filteredRecords = new();

    [ObservableProperty]
    private bool _hasNoSearchResults;

    private MonthlyData? _currentMonthData;

    public DashboardViewModel(IDataService dataService)
    {
        _dataService = dataService;
        SelectedYear = DateTime.Now.Year;
        SelectedMonth = DateTime.Now.Month;
    }

    public async Task InitializeAsync()
    {
        await LoadMonthAsync();
    }

    [RelayCommand]
    private void ToggleEditMode()
    {
        IsEditMode = !IsEditMode;
        EditModeButtonText = IsEditMode ? "Done" : "Edit";
        StatusMessage = IsEditMode
            ? "EDIT MODE - Double-click cells to edit. Click Save when finished."
            : "View mode.";
    }

    [RelayCommand]
    private async Task NavigateMonth(string direction)
    {
        if (direction == "prev")
        {
            SelectedMonth--;
            if (SelectedMonth < 1)
            {
                SelectedMonth = 12;
                SelectedYear--;
            }
        }
        else
        {
            SelectedMonth++;
            if (SelectedMonth > 12)
            {
                SelectedMonth = 1;
                SelectedYear++;
            }
        }

        await LoadMonthAsync();
    }

    // Called when inline cell editing completes
    public void MarkDirty()
    {
        HasUnsavedChanges = true;
        StatusMessage = "You have unsaved changes. Click Save to persist.";
    }

    // Sync in-memory records back to MonthlyData and save to disk
    [RelayCommand]
    private async Task SaveAllChanges()
    {
        if (_currentMonthData == null) return;

        // Sync ObservableCollection back to model
        _currentMonthData.Records = Records.OrderBy(r => r.Date).ToList();
        await _dataService.SaveMonthAsync(_currentMonthData);

        HasUnsavedChanges = false;
        RefreshSummary();

        // Exit edit mode after saving
        IsEditMode = false;
        EditModeButtonText = "Edit";
        StatusMessage = "All changes saved.";
    }

    public async Task SaveRecord(AttendanceRecord record)
    {
        EnsureCurrentMonth(record.Date);

        var existing = _currentMonthData!.Records.FirstOrDefault(r => r.Date == record.Date);
        if (existing != null)
        {
            _currentMonthData.Records.Remove(existing);
        }
        _currentMonthData.Records.Add(record);

        await SaveAndRefresh();
    }

    public async Task DeleteRecord(AttendanceRecord record)
    {
        if (_currentMonthData == null) return;

        var existing = _currentMonthData.Records.FirstOrDefault(r => r.Date == record.Date);
        if (existing != null)
        {
            _currentMonthData.Records.Remove(existing);
            await SaveAndRefresh();
            StatusMessage = $"Deleted record for {record.Date}";
        }
    }

    public bool HasPendingOvertimeRecords()
    {
        return _currentMonthData?.Records.Any(r => r.IsOvertimePending) ?? false;
    }

    public List<AttendanceRecord> GetPendingOvertimeRecords()
    {
        return _currentMonthData?.Records.Where(r => r.IsOvertimePending).ToList()
            ?? new List<AttendanceRecord>();
    }

    private void EnsureCurrentMonth(DateOnly date)
    {
        if (_currentMonthData == null || _currentMonthData.Year != date.Year || _currentMonthData.Month != date.Month)
        {
            SelectedYear = date.Year;
            SelectedMonth = date.Month;
        }

        _currentMonthData ??= new MonthlyData
        {
            Year = SelectedYear,
            Month = SelectedMonth,
            MonthLabel = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(SelectedMonth).ToUpper(),
            Title = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(SelectedMonth).ToUpper()} - MSW SETTLEMENT"
        };
    }

    public async Task LoadMonthAsync()
    {
        MonthYearDisplay = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(SelectedMonth).ToUpper()} {SelectedYear}";

        _currentMonthData = await _dataService.LoadMonthAsync(SelectedYear, SelectedMonth);

        if (_currentMonthData == null)
        {
            _currentMonthData = new MonthlyData
            {
                Year = SelectedYear,
                Month = SelectedMonth,
                MonthLabel = CultureInfo.InvariantCulture.DateTimeFormat.GetAbbreviatedMonthName(SelectedMonth).ToUpper(),
                Title = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(SelectedMonth).ToUpper()} - MSW SETTLEMENT"
            };
        }

        HasUnsavedChanges = false;
        RefreshDisplay();
    }

    public async Task ImportMonthData(MonthlyData data)
    {
        _currentMonthData = data;
        SelectedYear = data.Year;
        SelectedMonth = data.Month;

        await _dataService.SaveMonthAsync(data);
        MonthYearDisplay = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(SelectedMonth).ToUpper()} {SelectedYear}";
        HasUnsavedChanges = false;
        RefreshDisplay();
    }

    private async Task SaveAndRefresh()
    {
        if (_currentMonthData != null)
        {
            _currentMonthData.Records = _currentMonthData.Records.OrderBy(r => r.Date).ToList();
            await _dataService.SaveMonthAsync(_currentMonthData);
        }
        HasUnsavedChanges = false;
        RefreshDisplay();
    }

    private void RefreshDisplay()
    {
        Records = new ObservableCollection<AttendanceRecord>(
            _currentMonthData?.Records.OrderBy(r => r.Date) ?? Enumerable.Empty<AttendanceRecord>());
        RefreshSummary();
        ApplyFilter();
    }

    private void RefreshSummary()
    {
        TotalWorkDays = _currentMonthData?.TotalWorkDays ?? 0;
        OvertimeCount = _currentMonthData?.OvertimeCount ?? 0;
        TotalOvertimeDuration = _currentMonthData?.TotalOvertimeDisplay ?? "0 Hr 0 Min";
    }

    public MonthlyData? GetCurrentMonthData() => _currentMonthData;

    partial void OnSearchTextChanged(string value)
    {
        ApplyFilter();
    }

    [RelayCommand]
    private void ClearSearch()
    {
        SearchText = "";
    }

    private void ApplyFilter()
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            FilteredRecords = new ObservableCollection<AttendanceRecord>(
                Records.OrderBy(r => r.Date));
            HasNoSearchResults = false;
        }
        else
        {
            var lower = SearchText.ToLowerInvariant();
            var filtered = Records
                .Where(r => r.SearchText.Contains(lower))
                .OrderBy(r => r.Date)
                .ToList();
            FilteredRecords = new ObservableCollection<AttendanceRecord>(filtered);
            HasNoSearchResults = filtered.Count == 0;
        }
    }
}
