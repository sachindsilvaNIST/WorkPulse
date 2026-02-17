using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class MainWindowViewModel : ViewModelBase
{
    private readonly IDataService _dataService;
    private readonly IExcelImportService _excelImportService;
    private readonly IExcelExportService _excelExportService;

    [ObservableProperty]
    private DashboardViewModel _dashboard;

    [ObservableProperty]
    private string _statusMessage = "Ready";

    public Func<Task<string?>>? ShowOpenFileDialog { get; set; }
    public Func<string, Task<string?>>? ShowSaveFileDialog { get; set; }
    public Func<AttendanceEntryViewModel, Task<bool>>? ShowEditDialog { get; set; }
    public Func<string, string, Task<bool>>? ShowConfirmDialog { get; set; }

    public MainWindowViewModel()
    {
        _dataService = new JsonDataService();
        _excelImportService = new ExcelImportService();
        _excelExportService = new ExcelExportService();
        _dashboard = new DashboardViewModel(_dataService);
    }

    public MainWindowViewModel(IDataService dataService, IExcelImportService excelImportService,
        IExcelExportService excelExportService)
    {
        _dataService = dataService;
        _excelImportService = excelImportService;
        _excelExportService = excelExportService;
        _dashboard = new DashboardViewModel(dataService);
    }

    public async Task InitializeAsync()
    {
        await Dashboard.InitializeAsync();
    }

    [RelayCommand]
    private async Task ImportExcel()
    {
        try
        {
            var filePath = ShowOpenFileDialog != null ? await ShowOpenFileDialog() : null;
            if (string.IsNullOrEmpty(filePath)) return;

            StatusMessage = "Importing...";
            var monthsData = await _excelImportService.ImportFromExcelAsync(filePath);

            if (monthsData.Count == 0)
            {
                StatusMessage = "No data found in the Excel file.";
                return;
            }

            foreach (var monthData in monthsData)
            {
                await _dataService.SaveMonthAsync(monthData);
            }

            var lastMonth = monthsData[^1];
            await Dashboard.ImportMonthData(lastMonth);

            StatusMessage = $"Imported {monthsData.Count} month(s) successfully.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Import failed: {ex.Message}";
        }
    }

    

    [RelayCommand]
    private async Task ExportExcel()
    {
        try
        {
            var currentData = Dashboard.GetCurrentMonthData();
            if (currentData == null || currentData.Records.Count == 0)
            {
                StatusMessage = "No data to export.";
                return;
            }

            var suggestedName = $"{currentData.Title} {currentData.Year}";
            var filePath = ShowSaveFileDialog != null ? await ShowSaveFileDialog(suggestedName) : null;
            if (string.IsNullOrEmpty(filePath)) return;

            StatusMessage = "Exporting...";
            await _excelExportService.ExportToExcelAsync(new List<MonthlyData> { currentData }, filePath);
            StatusMessage = $"Exported to {System.IO.Path.GetFileName(filePath)}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Export failed: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task AddEntry()
    {
        var entryVm = new AttendanceEntryViewModel();

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await Dashboard.SaveRecord(record);
            StatusMessage = $"Added record for {record.Date}";
        }
    }

    [RelayCommand]
    private async Task EditEntry()
    {
        var selected = Dashboard.SelectedRecord;
        if (selected == null) return;

        var entryVm = new AttendanceEntryViewModel();
        entryVm.LoadFromRecord(selected);

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await Dashboard.SaveRecord(record);
            StatusMessage = $"Updated record for {record.Date}";
        }
    }

    [RelayCommand]
    private async Task DeleteEntry()
    {
        var selected = Dashboard.SelectedRecord;
        if (selected == null) return;

        if (ShowConfirmDialog != null)
        {
            var confirmed = await ShowConfirmDialog("Delete Record",
                $"Delete attendance record for {selected.Date:yyyy-MM-dd}?");
            if (!confirmed) return;
        }

        await Dashboard.DeleteRecord(selected);
    }

    [RelayCommand]
    private async Task AddHoliday()
    {
        var entryVm = new AttendanceEntryViewModel
        {
            DayType = DayType.Holiday,
            WindowTitle = "Add Holiday"
        };

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await Dashboard.SaveRecord(record);
            StatusMessage = $"Added holiday: {record.HolidayName} on {record.Date}";
        }
    }
}
