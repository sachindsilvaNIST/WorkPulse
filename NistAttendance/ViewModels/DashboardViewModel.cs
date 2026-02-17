using System;
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

    [RelayCommand]
    private async Task LoginNow()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var now = new TimeOnly(DateTime.Now.Hour, DateTime.Now.Minute);

        EnsureCurrentMonth(today);

        var record = _currentMonthData!.Records.FirstOrDefault(r => r.Date == today);
        if (record == null)
        {
            record = new AttendanceRecord
            {
                Date = today,
                DayType = DayType.WorkDay,
                LoginTime = now
            };
            _currentMonthData.Records.Add(record);
        }
        else
        {
            record.LoginTime = now;
        }

        await SaveAndRefresh();
        StatusMessage = $"Login recorded at {now:H:mm}";
    }

    [RelayCommand]
    private async Task LogoutNow()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var now = new TimeOnly(DateTime.Now.Hour, DateTime.Now.Minute);

        EnsureCurrentMonth(today);

        var record = _currentMonthData!.Records.FirstOrDefault(r => r.Date == today);
        if (record == null)
        {
            StatusMessage = "No login record for today. Please login first.";
            return;
        }

        record.LogoutTime = now;

        // Auto-calculate overtime
        var (isOt, hrs, mins) = OvertimeCalculator.Calculate(record.LoginTime, record.LogoutTime);
        record.IsOvertime = isOt;
        record.OvertimeHours = hrs;
        record.OvertimeMinutes = mins;

        await SaveAndRefresh();
        StatusMessage = $"Logout recorded at {now:H:mm}" +
            (isOt ? $" (OT: {hrs}h {mins}m)" : "");
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

        RefreshDisplay();
    }

    public async Task ImportMonthData(MonthlyData data)
    {
        _currentMonthData = data;
        SelectedYear = data.Year;
        SelectedMonth = data.Month;

        await _dataService.SaveMonthAsync(data);
        MonthYearDisplay = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(SelectedMonth).ToUpper()} {SelectedYear}";
        RefreshDisplay();
    }

    private async Task SaveAndRefresh()
    {
        if (_currentMonthData != null)
        {
            _currentMonthData.Records = _currentMonthData.Records.OrderBy(r => r.Date).ToList();
            await _dataService.SaveMonthAsync(_currentMonthData);
        }
        RefreshDisplay();
    }

    private void RefreshDisplay()
    {
        Records = new ObservableCollection<AttendanceRecord>(
            _currentMonthData?.Records.OrderBy(r => r.Date) ?? Enumerable.Empty<AttendanceRecord>());

        TotalWorkDays = _currentMonthData?.TotalWorkDays ?? 0;
        OvertimeCount = _currentMonthData?.OvertimeCount ?? 0;
        TotalOvertimeDuration = _currentMonthData?.TotalOvertimeDisplay ?? "0 Hr 0 Min";
    }

    public MonthlyData? GetCurrentMonthData() => _currentMonthData;
}
