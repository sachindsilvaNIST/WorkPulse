using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

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
    private List<AttendanceRecord>? _allRecordsCache;

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
        InvalidateGlobalCache();
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

    public async Task SaveRecords(List<AttendanceRecord> records)
    {
        // Group records by (Year, Month) to handle cross-month business trips
        var groups = records.GroupBy(r => (r.Date.Year, r.Date.Month));

        foreach (var group in groups)
        {
            var (year, month) = group.Key;
            var monthData = await _dataService.LoadMonthAsync(year, month)
                ?? new MonthlyData
                {
                    Year = year,
                    Month = month,
                    MonthLabel = System.Globalization.CultureInfo.InvariantCulture
                        .DateTimeFormat.GetAbbreviatedMonthName(month).ToUpper(),
                    Title = $"{System.Globalization.CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(month).ToUpper()} - MSW SETTLEMENT"
                };

            foreach (var record in group)
            {
                var existing = monthData.Records.FirstOrDefault(r => r.Date == record.Date);
                if (existing != null)
                    monthData.Records.Remove(existing);
                monthData.Records.Add(record);
            }

            monthData.Records = monthData.Records.OrderBy(r => r.Date).ToList();
            await _dataService.SaveMonthAsync(monthData);

            // Update in-memory state if this is the currently viewed month
            if (year == SelectedYear && month == SelectedMonth)
                _currentMonthData = monthData;
        }

        InvalidateGlobalCache();
        RefreshDisplay();
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
        InvalidateGlobalCache();
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
        InvalidateGlobalCache();
        RefreshDisplay();
    }

    private void RefreshDisplay()
    {
        Records = new ObservableCollection<AttendanceRecord>(
            _currentMonthData?.Records.OrderBy(r => r.Date) ?? Enumerable.Empty<AttendanceRecord>());
        RefreshSummary();
        _ = ApplyFilterAsync();
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
        _ = ApplyFilterAsync();
    }

    [RelayCommand]
    private void ClearSearch()
    {
        SearchText = "";
    }

    private async Task ApplyFilterAsync()
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            FilteredRecords = new ObservableCollection<AttendanceRecord>(
                Records.OrderBy(r => r.Date));
            HasNoSearchResults = false;
        }
        else
        {
            if (_allRecordsCache == null)
                await LoadAllRecordsAsync();

            var lower = SearchText.ToLowerInvariant();
            var filtered = _allRecordsCache!
                .Where(r => r.SearchText.Contains(lower))
                .OrderBy(r => r.Date)
                .ToList();
            FilteredRecords = new ObservableCollection<AttendanceRecord>(filtered);
            HasNoSearchResults = filtered.Count == 0;
        }
    }

    private async Task LoadAllRecordsAsync()
    {
        var months = await _dataService.GetAvailableMonthsAsync();
        var all = new List<AttendanceRecord>();

        foreach (var (year, month) in months)
        {
            var data = await _dataService.LoadMonthAsync(year, month);
            if (data?.Records != null)
                all.AddRange(data.Records);
        }

        _allRecordsCache = all.OrderBy(r => r.Date).ToList();
    }

    private void InvalidateGlobalCache()
    {
        _allRecordsCache = null;
    }
}
