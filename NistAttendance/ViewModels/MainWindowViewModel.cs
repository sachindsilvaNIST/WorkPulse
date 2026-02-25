using System;
using System.Collections.Generic;
using System.Linq;
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

    // Returns true if the app can close, false if user should stay
    public async Task<bool> CanCloseAsync()
    {
        if (Dashboard.HasPendingOvertimeRecords())
        {
            var pendingRecords = Dashboard.GetPendingOvertimeRecords();
            var dateList = string.Join("\n",
                pendingRecords.Select(r => $"  - {r.Date:yyyy-MM-dd} ({r.DayAbbreviation})"));

            var message = $"The following records have the Overtime field left blank:\n\n"
                + dateList
                + "\n\nPlease update the Overtime field before closing.";

            if (ShowConfirmDialog != null)
            {
                // Returns true = "Go Back", false = "Close Anyway"
                var goBack = await ShowConfirmDialog("OT Field Incomplete", message);
                return !goBack;
            }
        }
        return true;
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
        if (!Dashboard.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var entryVm = new AttendanceEntryViewModel();

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await Dashboard.SaveRecord(record);
            StatusMessage = $"Added record for {record.Date}";
        }
    }

    [RelayCommand]
    private async Task EditSelectedEntry()
    {
        if (!Dashboard.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = Dashboard.SelectedRecord;
        if (selected == null)
        {
            StatusMessage = "Select a row to edit.";
            return;
        }

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
        if (!Dashboard.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = Dashboard.SelectedRecord;
        if (selected == null)
        {
            StatusMessage = "Select a row to delete.";
            return;
        }

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
        if (!Dashboard.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var entryVm = new AttendanceEntryViewModel
        {
            DayType = DayType.PublicHoliday,
            WindowTitle = "Add Holiday / Leave"
        };

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await Dashboard.SaveRecord(record);
            StatusMessage = $"Added {record.DayType}: {record.HolidayName ?? record.LoginDisplay} on {record.Date}";
        }
    }
}
