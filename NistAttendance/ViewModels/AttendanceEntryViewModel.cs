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

    // Login defaults to 8:20
    [ObservableProperty]
    private int _loginHour = 8;

    [ObservableProperty]
    private int _loginMinute = 20;

    // Logout defaults to 17:25 (24h)
    [ObservableProperty]
    private int _logoutHour = 17;

    [ObservableProperty]
    private int _logoutMinute = 25;

    // Overtime dropdown: -1 = not selected, 0 = No, 1 = Yes
    [ObservableProperty]
    private int _overtimeSelection = -1;

    [ObservableProperty]
    private bool _showOvertimeTimePicker;

    // Overtime end time (when user chose Yes) - 24h format
    [ObservableProperty]
    private int _otEndHour = 21;

    [ObservableProperty]
    private int _otEndMinute = 0;

    [ObservableProperty]
    private int _overtimeHours;

    [ObservableProperty]
    private int _overtimeMinutes;

    [ObservableProperty]
    private bool _isOvertime;

    [ObservableProperty]
    private bool _isOvertimeDecided;

    [ObservableProperty]
    private bool _isWorkDay = true;

    [ObservableProperty]
    private bool _showHolidayName;

    [ObservableProperty]
    private string _windowTitle = "Add Attendance";

    [ObservableProperty]
    private string _overtimeResultText = "";

    [ObservableProperty]
    private string _validationError = "";

    [ObservableProperty]
    private bool _hasValidationError;

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
        ShowHolidayName = record.DayType is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday;

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

        if (record.IsOvertimeDecided)
        {
            OvertimeSelection = record.IsOvertime ? 1 : 0;
            IsOvertimeDecided = true;

            if (record.IsOvertime)
            {
                if (record.LogoutTime.HasValue)
                {
                    OtEndHour = record.LogoutTime.Value.Hour;
                    OtEndMinute = record.LogoutTime.Value.Minute;
                }
                ShowOvertimeTimePicker = true;
                OvertimeHours = record.OvertimeHours;
                OvertimeMinutes = record.OvertimeMinutes;
                IsOvertime = true;
                OvertimeResultText = $"Overtime: {record.OvertimeHours} Hr {record.OvertimeMinutes} Min";
            }
        }

        WindowTitle = $"Edit - {record.Date:yyyy-MM-dd}";
    }

    public AttendanceRecord ToRecord()
    {
        var date = DateOnly.FromDateTime(SelectedDate.DateTime);
        var record = new AttendanceRecord
        {
            Date = date,
            DayType = DayType,
            HolidayName = DayType is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday
                ? HolidayName : null
        };

        if (DayType == DayType.WorkDay)
        {
            record.LoginTime = new TimeOnly(LoginHour, LoginMinute);
            record.LogoutTime = new TimeOnly(LogoutHour, LogoutMinute);

            record.IsOvertimeDecided = IsOvertimeDecided;
            record.IsOvertime = IsOvertime;
            record.OvertimeHours = OvertimeHours;
            record.OvertimeMinutes = OvertimeMinutes;
        }

        return record;
    }

    partial void OnDayTypeChanged(DayType value)
    {
        IsWorkDay = value == DayType.WorkDay;
        ShowHolidayName = value is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday;
    }

    partial void OnOvertimeSelectionChanged(int value)
    {
        // Clear validation error when user makes a selection
        HasValidationError = false;
        ValidationError = "";

        if (value == 1) // Yes
        {
            ShowOvertimeTimePicker = true;
            IsOvertimeDecided = false; // Not decided until Confirm is clicked
        }
        else if (value == 0) // No
        {
            ShowOvertimeTimePicker = false;
            IsOvertime = false;
            IsOvertimeDecided = true;
            OvertimeHours = 0;
            OvertimeMinutes = 0;
            OvertimeResultText = "No overtime";
        }
    }

    [RelayCommand]
    private void ConfirmOvertime()
    {
        var otEndTime = new TimeOnly(OtEndHour, OtEndMinute);
        var loginTime = new TimeOnly(LoginHour, LoginMinute);

        var (isOt, hrs, mins) = OvertimeCalculator.Calculate(loginTime, otEndTime);
        IsOvertime = isOt;
        IsOvertimeDecided = true;
        OvertimeHours = hrs;
        OvertimeMinutes = mins;

        LogoutHour = OtEndHour;
        LogoutMinute = OtEndMinute;

        if (isOt)
            OvertimeResultText = $"Overtime: {hrs} Hr {mins} Min";
        else
            OvertimeResultText = "End time is within standard hours (no OT).";
    }

    [RelayCommand]
    private void CancelOvertime()
    {
        ShowOvertimeTimePicker = false;
        OvertimeSelection = -1;
        IsOvertimeDecided = false;
        IsOvertime = false;
        OvertimeHours = 0;
        OvertimeMinutes = 0;
        OvertimeResultText = "";
    }

    [RelayCommand]
    private void Save()
    {
        // Validate: Work day must have Overtime selected
        if (DayType == DayType.WorkDay && OvertimeSelection == -1)
        {
            HasValidationError = true;
            ValidationError = "Please select Yes or No for Overtime before saving.";
            return;
        }

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
