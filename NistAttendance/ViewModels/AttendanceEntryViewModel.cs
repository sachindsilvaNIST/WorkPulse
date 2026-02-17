using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class AttendanceEntryViewModel : ViewModelBase
{
    [ObservableProperty]
    private DateTimeOffset _selectedDate = DateTimeOffset.Now;

    [ObservableProperty]
    private DayType _dayType = DayType.WorkDay;

    [ObservableProperty]
    private string? _holidayName;

    [ObservableProperty]
    private int _loginHour = 8;

    [ObservableProperty]
    private int _loginMinute = 20;

    [ObservableProperty]
    private int _logoutHour = 17;

    [ObservableProperty]
    private int _logoutMinute = 25;

    [ObservableProperty]
    private int _overtimeHours;

    [ObservableProperty]
    private int _overtimeMinutes;

    [ObservableProperty]
    private bool _isOvertime;

    [ObservableProperty]
    private string? _notes;

    [ObservableProperty]
    private bool _isWorkDay = true;

    [ObservableProperty]
    private string _windowTitle = "Add Attendance";

    public bool DialogResult { get; private set; }
    public Action? CloseAction { get; set; }

    public AttendanceEntryViewModel()
    {
    }

    public void LoadFromRecord(AttendanceRecord record)
    {
        SelectedDate = new DateTimeOffset(record.Date.ToDateTime(TimeOnly.MinValue));
        DayType = record.DayType;
        HolidayName = record.HolidayName;
        IsWorkDay = record.DayType == DayType.WorkDay;

        if (record.LoginTime.HasValue)
        {
            LoginHour = record.LoginTime.Value.Hour;
            LoginMinute = record.LoginTime.Value.Minute;
        }

        if (record.LogoutTime.HasValue)
        {
            LogoutHour = record.LogoutTime.Value.Hour;
            LogoutMinute = record.LogoutTime.Value.Minute;
        }

        OvertimeHours = record.OvertimeHours;
        OvertimeMinutes = record.OvertimeMinutes;
        IsOvertime = record.IsOvertime;
        Notes = record.Notes;
        WindowTitle = $"Edit - {record.Date:yyyy-MM-dd}";
    }

    public AttendanceRecord ToRecord()
    {
        var date = DateOnly.FromDateTime(SelectedDate.DateTime);
        var record = new AttendanceRecord
        {
            Date = date,
            DayType = DayType,
            HolidayName = DayType == DayType.Holiday ? HolidayName : null,
            Notes = Notes
        };

        if (DayType == DayType.WorkDay)
        {
            record.LoginTime = new TimeOnly(LoginHour, LoginMinute);
            record.LogoutTime = new TimeOnly(LogoutHour, LogoutMinute);

            var (isOt, hrs, mins) = OvertimeCalculator.Calculate(record.LoginTime, record.LogoutTime);
            record.IsOvertime = isOt;
            record.OvertimeHours = hrs;
            record.OvertimeMinutes = mins;
        }

        return record;
    }

    partial void OnDayTypeChanged(DayType value)
    {
        IsWorkDay = value == DayType.WorkDay;
    }

    partial void OnLogoutHourChanged(int value) => RecalculateOvertime();
    partial void OnLogoutMinuteChanged(int value) => RecalculateOvertime();

    private void RecalculateOvertime()
    {
        if (DayType != DayType.WorkDay) return;

        var login = new TimeOnly(LoginHour, LoginMinute);
        var logout = new TimeOnly(LogoutHour, LogoutMinute);
        var (isOt, hrs, mins) = OvertimeCalculator.Calculate(login, logout);
        IsOvertime = isOt;
        OvertimeHours = hrs;
        OvertimeMinutes = mins;
    }

    [RelayCommand]
    private void Save()
    {
        DialogResult = true;
        CloseAction?.Invoke();
    }

    [RelayCommand]
    private void Cancel()
    {
        DialogResult = false;
        CloseAction?.Invoke();
    }
}
