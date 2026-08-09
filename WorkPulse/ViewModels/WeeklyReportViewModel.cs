using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

public partial class WeeklyReportViewModel : ViewModelBase
{
    private readonly IWeeklyReportDataService _dataService;
    private readonly ISettingsService _settingsService;
    private List<WeeklyReport> _reports = new();
    private Timer? _saveTimer;
    private bool _suppressAutosave;

    [ObservableProperty]
    private ObservableCollection<WeeklyReport> _filteredReports = new();

    [ObservableProperty]
    private WeeklyReport? _selectedReport;

    [ObservableProperty]
    private string _titleInput = "";

    [ObservableProperty]
    private string _bodyInput = "";

    [ObservableProperty]
    private DateTimeOffset? _dateInput = DateTimeOffset.Now;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private string _saveStatus = "";

    [ObservableProperty]
    private string _reportsDirectoryDisplay = "";

    public Func<Task<string?>>? ShowFolderDialog { get; set; }
    public Action? GoBack { get; set; }

    public WeeklyReportViewModel(IWeeklyReportDataService dataService, ISettingsService settingsService)
    {
        _dataService = dataService;
        _settingsService = settingsService;
    }

    [RelayCommand]
    private void NavigateBack() => GoBack?.Invoke();

    public async Task InitializeAsync()
    {
        _reports = await _dataService.LoadAllAsync();
        ApplyFilter();
        await RefreshDirectoryDisplayAsync();
    }

    private async Task RefreshDirectoryDisplayAsync()
    {
        var settings = await _settingsService.LoadAsync();
        ReportsDirectoryDisplay = string.IsNullOrWhiteSpace(settings.DefaultReportsDirectory)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "WorkPulse Reports")
            : settings.DefaultReportsDirectory;
    }

    [RelayCommand]
    private async Task BrowseDirectory()
    {
        if (ShowFolderDialog == null) return;

        var folder = await ShowFolderDialog();
        if (string.IsNullOrEmpty(folder)) return;

        var settings = await _settingsService.LoadAsync();
        settings.DefaultReportsDirectory = folder;
        await _settingsService.SaveAsync(settings);
        ReportsDirectoryDisplay = folder;

        _reports = await _dataService.LoadAllAsync();
        ApplyFilter();
        SelectedReport = null;
    }

    partial void OnSearchTextChanged(string value) => ApplyFilter();

    private void ApplyFilter()
    {
        var selectedId = SelectedReport?.Id;

        var source = string.IsNullOrWhiteSpace(SearchText)
            ? _reports.AsEnumerable()
            : _reports.Where(r => r.SearchText.Contains(SearchText.ToLowerInvariant()));

        FilteredReports = new ObservableCollection<WeeklyReport>(source.OrderByDescending(r => r.WeekStartDate));

        // Replacing ItemsSource resets the ListBox's selection — restore it so autosave
        // (which calls ApplyFilter) doesn't silently collapse the open editor pane.
        if (selectedId != null)
        {
            var match = FilteredReports.FirstOrDefault(r => r.Id == selectedId);
            if (match != null) SelectedReport = match;
        }
    }

    partial void OnSelectedReportChanged(WeeklyReport? value)
    {
        _suppressAutosave = true;
        if (value != null)
        {
            TitleInput = value.Title;
            BodyInput = value.Body;
            DateInput = new DateTimeOffset(value.WeekStartDate.ToDateTime(TimeOnly.MinValue));
        }
        SaveStatus = "";
        _suppressAutosave = false;
    }

    [RelayCommand]
    private async Task NewReport()
    {
        var report = new WeeklyReport
        {
            Id = Guid.NewGuid().ToString(),
            WeekStartDate = DateOnly.FromDateTime(DateTime.Today),
            Title = "",
            Body = ""
        };

        _reports.Insert(0, report);
        await _dataService.SaveAllAsync(_reports);
        ApplyFilter();
        SelectedReport = report;
    }

    [RelayCommand]
    private async Task DeleteSelected()
    {
        if (SelectedReport == null) return;

        _reports.RemoveAll(r => r.Id == SelectedReport.Id);
        await _dataService.SaveAllAsync(_reports);
        ApplyFilter();
        SelectedReport = null;
        TitleInput = "";
        BodyInput = "";
    }

    partial void OnTitleInputChanged(string value) => ScheduleSave();
    partial void OnBodyInputChanged(string value) => ScheduleSave();

    partial void OnDateInputChanged(DateTimeOffset? value)
    {
        if (_suppressAutosave || SelectedReport == null || value == null) return;
        ScheduleSave();
    }

    private void ScheduleSave()
    {
        if (_suppressAutosave || SelectedReport == null) return;

        SaveStatus = "Editing…";
        _saveTimer?.Dispose();
        _saveTimer = new Timer(_ => _ = SaveSelectedAsync(), null, TimeSpan.FromMilliseconds(800), Timeout.InfiniteTimeSpan);
    }

    private async Task SaveSelectedAsync()
    {
        if (SelectedReport == null) return;

        SelectedReport.Title = TitleInput;
        SelectedReport.Body = BodyInput;
        SelectedReport.WeekStartDate = DateOnly.FromDateTime((DateInput ?? DateTimeOffset.Now).DateTime);

        await _dataService.SaveAllAsync(_reports);

        // Deliberately NOT calling ApplyFilter() here: replacing FilteredReports' ItemsSource
        // resets the ListBox's selection on the next layout pass (after any synchronous fix-up),
        // which would collapse the open editor mid-edit. The sidebar preview/sort order for the
        // note being edited catches up next time the list is rebuilt (switch notes, search, etc).
        Avalonia.Threading.Dispatcher.UIThread.Post(() =>
        {
            SaveStatus = $"Saved {DateTime.Now:HH:mm:ss}";
        });
    }
}
