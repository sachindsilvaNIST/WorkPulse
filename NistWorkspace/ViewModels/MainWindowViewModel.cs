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
    // Attendance services
    private readonly IDataService _dataService;
    private readonly IExcelImportService _excelImportService;
    private readonly IExcelExportService _excelExportService;

    // Contact services
    private readonly IContactDataService _contactDataService;
    private readonly ContactExcelImportService _contactExcelImportService;
    private readonly ContactExcelExportService _contactExcelExportService;

    // File search service
    private readonly IFileIndexService _fileIndexService;

    // Navigation
    [ObservableProperty]
    private ViewModelBase _currentView;

    [ObservableProperty]
    private string _currentViewName = "home";

    [ObservableProperty]
    private string _statusMessage = "Ready";

    // Settings service
    private readonly ISettingsService _settingsService;

    // Cached ViewModels
    private DashboardViewModel? _dashboardVm;
    private ContactBookDashboardViewModel? _contactBookVm;
    private FileSearchViewModel? _fileSearchVm;
    private SettingsViewModel? _settingsVm;

    // Accessors for closing logic
    public DashboardViewModel? AttendanceDashboard => _dashboardVm;
    public ContactBookDashboardViewModel? ContactBookDashboard => _contactBookVm;
    public FileSearchViewModel? FileSearchDashboard => _fileSearchVm;

    // Dialog callbacks
    public Func<Task<string?>>? ShowOpenFileDialog { get; set; }
    public Func<string, Task<string?>>? ShowSaveFileDialog { get; set; }
    public Func<AttendanceEntryViewModel, Task<bool>>? ShowEditDialog { get; set; }
    public Func<ContactEntryViewModel, Task<bool>>? ShowContactEditDialog { get; set; }
    public Func<string, string, Task<bool>>? ShowConfirmDialog { get; set; }

    public MainWindowViewModel()
    {
        _dataService = new JsonDataService();
        _excelImportService = new ExcelImportService();
        _excelExportService = new ExcelExportService();
        _contactDataService = new JsonContactDataService();
        _contactExcelImportService = new ContactExcelImportService();
        _contactExcelExportService = new ContactExcelExportService();
        _fileIndexService = new FileIndexService();
        _settingsService = new SettingsService();

        _currentView = new HomeViewModel(NavigateTo);
    }

    public async Task InitializeAsync()
    {
        // Nothing to init on home screen
        await Task.CompletedTask;
    }

    // --- Navigation ---

    public void NavigateTo(string target)
    {
        switch (target)
        {
            case "home":
                CurrentView = new HomeViewModel(NavigateTo);
                CurrentViewName = "home";
                StatusMessage = "Ready";
                break;

            case "attendance":
                _dashboardVm ??= new DashboardViewModel(_dataService);
                OnPropertyChanged(nameof(AttendanceDashboard));
                CurrentView = _dashboardVm;
                CurrentViewName = "attendance";
                StatusMessage = _dashboardVm.StatusMessage;
                _ = _dashboardVm.InitializeAsync();
                break;

            case "contacts":
                _contactBookVm ??= new ContactBookDashboardViewModel(_contactDataService);
                OnPropertyChanged(nameof(ContactBookDashboard));
                CurrentView = _contactBookVm;
                CurrentViewName = "contacts";
                StatusMessage = _contactBookVm.StatusMessage;
                _ = _contactBookVm.InitializeAsync();
                break;

            case "search":
                _fileSearchVm ??= new FileSearchViewModel(_fileIndexService);
                OnPropertyChanged(nameof(FileSearchDashboard));
                CurrentView = _fileSearchVm;
                CurrentViewName = "search";
                StatusMessage = _fileSearchVm.StatusMessage;
                _ = _fileSearchVm.InitializeAsync();
                break;

            case "settings":
                _settingsVm ??= new SettingsViewModel(_settingsService);
                CurrentView = _settingsVm;
                CurrentViewName = "settings";
                StatusMessage = "Settings";
                _ = _settingsVm.InitializeAsync();
                break;
        }
    }

    [RelayCommand]
    private void GoHome() => NavigateTo("home");

    [RelayCommand]
    private void GoToSettings() => NavigateTo("settings");

    // --- Closing Logic ---

    public async Task<bool> CanCloseAsync()
    {
        if (_dashboardVm != null && _dashboardVm.HasPendingOvertimeRecords())
        {
            var pendingRecords = _dashboardVm.GetPendingOvertimeRecords();
            var dateList = string.Join("\n",
                pendingRecords.Select(r => $"  - {r.Date:yyyy-MM-dd} ({r.DayAbbreviation})"));

            var message = $"The following records have the Overtime field left blank:\n\n"
                + dateList
                + "\n\nPlease update the Overtime field before closing.";

            if (ShowConfirmDialog != null)
            {
                var goBack = await ShowConfirmDialog("OT Field Incomplete", message);
                return !goBack;
            }
        }
        return true;
    }

    // --- Import / Export (context-aware) ---

    [RelayCommand]
    private async Task ImportExcel()
    {
        if (CurrentViewName == "attendance")
            await ImportAttendanceExcel();
        else if (CurrentViewName == "contacts")
            await ImportContactsExcel();
    }

    [RelayCommand]
    private async Task ExportExcel()
    {
        if (CurrentViewName == "attendance")
            await ExportAttendanceExcel();
        else if (CurrentViewName == "contacts")
            await ExportContactsExcel();
    }

    private async Task ImportAttendanceExcel()
    {
        if (_dashboardVm == null) return;
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
            await _dashboardVm.ImportMonthData(lastMonth);

            StatusMessage = $"Imported {monthsData.Count} month(s) successfully.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Import failed: {ex.Message}";
        }
    }

    private async Task ExportAttendanceExcel()
    {
        if (_dashboardVm == null) return;
        try
        {
            var currentData = _dashboardVm.GetCurrentMonthData();
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

    private async Task ImportContactsExcel()
    {
        if (_contactBookVm == null) return;
        try
        {
            var filePath = ShowOpenFileDialog != null ? await ShowOpenFileDialog() : null;
            if (string.IsNullOrEmpty(filePath)) return;

            StatusMessage = "Importing contacts...";
            var contacts = await _contactExcelImportService.ImportFromExcelAsync(filePath);

            if (contacts.Count == 0)
            {
                StatusMessage = "No contacts found in the Excel file.";
                return;
            }

            await _contactBookVm.ImportContacts(contacts);
            StatusMessage = $"Imported {contacts.Count} contacts successfully.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Import failed: {ex.Message}";
        }
    }

    private async Task ExportContactsExcel()
    {
        if (_contactBookVm == null) return;
        try
        {
            var contacts = _contactBookVm.GetAllContacts();
            if (contacts.Count == 0)
            {
                StatusMessage = "No contacts to export.";
                return;
            }

            var filePath = ShowSaveFileDialog != null ? await ShowSaveFileDialog("NIST Contact Book") : null;
            if (string.IsNullOrEmpty(filePath)) return;

            StatusMessage = "Exporting contacts...";
            await _contactExcelExportService.ExportToExcelAsync(contacts, filePath);
            StatusMessage = $"Exported to {System.IO.Path.GetFileName(filePath)}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Export failed: {ex.Message}";
        }
    }

    // --- Attendance CRUD ---

    [RelayCommand]
    private async Task AddEntry()
    {
        if (_dashboardVm == null || !_dashboardVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var entryVm = new AttendanceEntryViewModel();

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var records = entryVm.ToRecords();
            if (records.Count == 1)
            {
                await _dashboardVm.SaveRecord(records[0]);
                StatusMessage = $"Added record for {records[0].Date}";
            }
            else
            {
                await _dashboardVm.SaveRecords(records);
                StatusMessage = $"Added {records.Count} business trip records ({records[0].Date} to {records[^1].Date})";
            }
        }
    }

    [RelayCommand]
    private async Task EditSelectedEntry()
    {
        if (_dashboardVm == null || !_dashboardVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = _dashboardVm.SelectedRecord;
        if (selected == null)
        {
            StatusMessage = "Select a row to edit.";
            return;
        }

        var entryVm = new AttendanceEntryViewModel();
        entryVm.LoadFromRecord(selected);

        if (ShowEditDialog != null && await ShowEditDialog(entryVm))
        {
            var records = entryVm.ToRecords();
            if (records.Count == 1)
            {
                await _dashboardVm.SaveRecord(records[0]);
                StatusMessage = $"Updated record for {records[0].Date}";
            }
            else
            {
                await _dashboardVm.SaveRecords(records);
                StatusMessage = $"Updated {records.Count} business trip records ({records[0].Date} to {records[^1].Date})";
            }
        }
    }

    [RelayCommand]
    private async Task DeleteEntry()
    {
        if (CurrentViewName == "attendance")
            await DeleteAttendanceEntry();
        else if (CurrentViewName == "contacts")
            await DeleteContactEntry();
    }

    private async Task DeleteAttendanceEntry()
    {
        if (_dashboardVm == null || !_dashboardVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = _dashboardVm.SelectedRecord;
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

        await _dashboardVm.DeleteRecord(selected);
    }

    private async Task DeleteContactEntry()
    {
        if (_contactBookVm == null || !_contactBookVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = _contactBookVm.SelectedContact;
        if (selected == null)
        {
            StatusMessage = "Select a contact to delete.";
            return;
        }

        if (ShowConfirmDialog != null)
        {
            var confirmed = await ShowConfirmDialog("Delete Contact",
                $"Delete contact: {selected.FullName}?");
            if (!confirmed) return;
        }

        await _contactBookVm.DeleteContact(selected);
    }

    [RelayCommand]
    private async Task AddHoliday()
    {
        if (_dashboardVm == null || !_dashboardVm.IsEditMode)
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
            var records = entryVm.ToRecords();
            if (records.Count == 1)
            {
                await _dashboardVm.SaveRecord(records[0]);
                StatusMessage = $"Added {records[0].DayType}: {records[0].HolidayName ?? records[0].LoginDisplay} on {records[0].Date}";
            }
            else
            {
                await _dashboardVm.SaveRecords(records);
                StatusMessage = $"Added {records.Count} business trip records ({records[0].Date} to {records[^1].Date})";
            }
        }
    }

    // --- Contact CRUD ---

    [RelayCommand]
    private async Task AddContact()
    {
        if (_contactBookVm == null || !_contactBookVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var entryVm = new ContactEntryViewModel();
        PopulateContactSuggestions(entryVm);

        if (ShowContactEditDialog != null && await ShowContactEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await _contactBookVm.AddContact(record);
        }
    }

    [RelayCommand]
    private async Task EditContact()
    {
        if (_contactBookVm == null || !_contactBookVm.IsEditMode)
        {
            StatusMessage = "Please enter EDIT MODE first by clicking the Edit button.";
            return;
        }

        var selected = _contactBookVm.SelectedContact;
        if (selected == null)
        {
            StatusMessage = "Select a contact to edit.";
            return;
        }

        var entryVm = new ContactEntryViewModel();
        PopulateContactSuggestions(entryVm);
        entryVm.LoadFromRecord(selected);

        if (ShowContactEditDialog != null && await ShowContactEditDialog(entryVm))
        {
            var record = entryVm.ToRecord();
            await _contactBookVm.UpdateContact(record);
        }
    }

    private void PopulateContactSuggestions(ContactEntryViewModel entryVm)
    {
        if (_contactBookVm == null) return;
        entryVm.AffiliationSuggestions = _contactBookVm.GetDistinctValues(c => c.Affiliation);
        entryVm.FamilyNameSuggestions = _contactBookVm.GetDistinctValues(c => c.FamilyName);
        entryVm.GivenNameSuggestions = _contactBookVm.GetDistinctValues(c => c.GivenName);
        entryVm.DepartmentSuggestions = _contactBookVm.GetDistinctValues(c => c.Department);
        entryVm.EmailSuggestions = _contactBookVm.GetDistinctValues(c => c.Email);
        entryVm.IntercomSuggestions = _contactBookVm.GetDistinctValues(c => c.Intercom);
        entryVm.ContactNumberSuggestions = _contactBookVm.GetDistinctValues(c => c.ContactNumber);
        entryVm.NotesSuggestions = _contactBookVm.GetDistinctValues(c => c.Notes);
    }
}
