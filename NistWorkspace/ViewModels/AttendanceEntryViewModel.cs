using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
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

    // Business Trip fields
    [ObservableProperty]
    private bool _showBusinessTripFields;

    // Trip type: -1 = not selected, 0 = Domestic, 1 = Overseas
    [ObservableProperty]
    private int _tripCategoryIndex = -1;

    [ObservableProperty]
    private bool _showPrefectureDropdown;

    [ObservableProperty]
    private bool _showCountryDropdown;

    [ObservableProperty]
    private string? _selectedPrefecture;

    [ObservableProperty]
    private string? _selectedCountry;

    public List<string> Prefectures { get; } = TripData.Prefectures;
    public List<string> Countries { get; } = TripData.Countries;

    [ObservableProperty]
    private DateTimeOffset _departureDate = DateTimeOffset.Now;

    [ObservableProperty]
    private DateTimeOffset _returnDate = DateTimeOffset.Now;

    [ObservableProperty]
    private ObservableCollection<string> _tripLocations = new();

    [ObservableProperty]
    private string _newLocationText = "";

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
        ShowBusinessTripFields = record.DayType == DayType.BusinessTrip;

        if (record.DayType == DayType.BusinessTrip)
        {
            DepartureDate = new DateTimeOffset(record.Date.ToDateTime(TimeOnly.MinValue));
            ReturnDate = DepartureDate;
            if (!string.IsNullOrWhiteSpace(record.HolidayName))
            {
                TripLocations = new ObservableCollection<string>(
                    record.HolidayName.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries));
            }

            // Restore trip category
            if (record.TripCategory.HasValue)
            {
                TripCategoryIndex = record.TripCategory.Value == TripCategory.Domestic ? 0 : 1;
                if (record.TripCategory.Value == TripCategory.Domestic)
                    SelectedPrefecture = record.TripRegion;
                else
                    SelectedCountry = record.TripRegion;
            }
        }

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
                ? HolidayName
                : DayType == DayType.BusinessTrip && TripLocations.Count > 0
                    ? string.Join(", ", TripLocations)
                    : null
        };

        if (DayType == DayType.BusinessTrip)
        {
            record.TripCategory = TripCategoryIndex switch
            {
                0 => TripCategory.Domestic,
                1 => TripCategory.Overseas,
                _ => null
            };
            record.TripRegion = TripCategoryIndex == 0 ? SelectedPrefecture : SelectedCountry;
        }

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

    public List<AttendanceRecord> ToRecords()
    {
        if (DayType != DayType.BusinessTrip)
            return new List<AttendanceRecord> { ToRecord() };

        var locationString = TripLocations.Count > 0
            ? string.Join(", ", TripLocations)
            : null;

        var departure = DateOnly.FromDateTime(DepartureDate.DateTime);
        var returnDate = DateOnly.FromDateTime(ReturnDate.DateTime);

        if (returnDate < departure)
            returnDate = departure;

        var tripCategory = TripCategoryIndex switch
        {
            0 => (TripCategory?)TripCategory.Domestic,
            1 => (TripCategory?)TripCategory.Overseas,
            _ => null
        };
        var tripRegion = TripCategoryIndex == 0 ? SelectedPrefecture : SelectedCountry;

        var records = new List<AttendanceRecord>();
        for (var d = departure; d <= returnDate; d = d.AddDays(1))
        {
            records.Add(new AttendanceRecord
            {
                Date = d,
                DayType = DayType.BusinessTrip,
                HolidayName = locationString,
                TripCategory = tripCategory,
                TripRegion = tripRegion
            });
        }

        return records;
    }

    partial void OnDayTypeChanged(DayType value)
    {
        IsWorkDay = value == DayType.WorkDay;
        ShowHolidayName = value is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday;
        ShowBusinessTripFields = value == DayType.BusinessTrip;

        if (value != DayType.BusinessTrip)
        {
            TripCategoryIndex = -1;
            ShowPrefectureDropdown = false;
            ShowCountryDropdown = false;
        }
    }

    partial void OnTripCategoryIndexChanged(int value)
    {
        ShowPrefectureDropdown = value == 0; // Domestic
        ShowCountryDropdown = value == 1;    // Overseas

        if (value == 0)
            SelectedCountry = null;
        else if (value == 1)
            SelectedPrefecture = null;
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
    private void AddLocation()
    {
        var trimmed = NewLocationText?.Trim();
        if (!string.IsNullOrEmpty(trimmed) && !TripLocations.Contains(trimmed))
        {
            TripLocations.Add(trimmed);
            NewLocationText = "";
        }
    }

    [RelayCommand]
    private void RemoveLocation(string location)
    {
        TripLocations.Remove(location);
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

        // Validate: Business trip fields
        if (DayType == DayType.BusinessTrip)
        {
            if (TripCategoryIndex == -1)
            {
                HasValidationError = true;
                ValidationError = "Please select a trip type (Domestic or Overseas).";
                return;
            }

            if (TripCategoryIndex == 0 && string.IsNullOrWhiteSpace(SelectedPrefecture))
            {
                HasValidationError = true;
                ValidationError = "Please select a prefecture for the domestic trip.";
                return;
            }

            if (TripCategoryIndex == 1 && string.IsNullOrWhiteSpace(SelectedCountry))
            {
                HasValidationError = true;
                ValidationError = "Please select a country for the overseas trip.";
                return;
            }

            if (TripLocations.Count == 0)
            {
                HasValidationError = true;
                ValidationError = "Please add at least one business trip location.";
                return;
            }

            var dep = DateOnly.FromDateTime(DepartureDate.DateTime);
            var ret = DateOnly.FromDateTime(ReturnDate.DateTime);
            if (ret < dep)
            {
                HasValidationError = true;
                ValidationError = "Return date must be on or after the departure date.";
                return;
            }
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
