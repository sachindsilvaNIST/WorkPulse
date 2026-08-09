using System;
using System.Collections.Generic;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;

namespace WorkPulse.ViewModels;

public partial class TripReportEntryViewModel : ViewModelBase
{
    [ObservableProperty]
    private int _tripCategoryIndex = 0;

    [ObservableProperty]
    private bool _showPrefectureDropdown = true;

    [ObservableProperty]
    private bool _showCountryDropdown;

    [ObservableProperty]
    private string? _selectedPrefecture;

    [ObservableProperty]
    private string? _selectedCountry;

    public List<string> Prefectures { get; } = TripData.Prefectures;
    public List<string> Countries { get; } = TripData.Countries;

    [ObservableProperty]
    private DateTimeOffset? _startDateInput = DateTimeOffset.Now;

    [ObservableProperty]
    private DateTimeOffset? _endDateInput = DateTimeOffset.Now;

    [ObservableProperty]
    private string _purpose = "";

    [ObservableProperty]
    private string _notes = "";

    [ObservableProperty]
    private string _windowTitle = "Add Business Trip";

    [ObservableProperty]
    private string _validationError = "";

    [ObservableProperty]
    private bool _hasValidationError;

    public string? EditingId { get; private set; }
    public bool DialogResult { get; private set; }
    public Action? CloseAction { get; set; }

    partial void OnTripCategoryIndexChanged(int value)
    {
        ShowPrefectureDropdown = value == 0;
        ShowCountryDropdown = value == 1;
        if (value == 0) SelectedCountry = null;
        else SelectedPrefecture = null;
    }

    public void LoadFromRecord(TripReport record)
    {
        EditingId = record.Id;
        TripCategoryIndex = record.Category == TripCategory.Domestic ? 0 : 1;
        if (record.Category == TripCategory.Domestic)
            SelectedPrefecture = record.Destination;
        else
            SelectedCountry = record.Destination;
        StartDateInput = new DateTimeOffset(record.StartDate.ToDateTime(TimeOnly.MinValue));
        EndDateInput = new DateTimeOffset(record.EndDate.ToDateTime(TimeOnly.MinValue));
        Purpose = record.Purpose;
        Notes = record.Notes;
        WindowTitle = $"Edit - {record.Destination}";
    }

    public TripReport ToRecord()
    {
        var category = TripCategoryIndex == 0 ? TripCategory.Domestic : TripCategory.Overseas;
        var destination = TripCategoryIndex == 0 ? SelectedPrefecture : SelectedCountry;

        return new TripReport
        {
            Id = EditingId ?? Guid.NewGuid().ToString(),
            Category = category,
            Destination = destination ?? "",
            StartDate = DateOnly.FromDateTime((StartDateInput ?? DateTimeOffset.Now).DateTime),
            EndDate = DateOnly.FromDateTime((EndDateInput ?? DateTimeOffset.Now).DateTime),
            Purpose = Purpose.Trim(),
            Notes = Notes.Trim()
        };
    }

    [RelayCommand]
    private void Save()
    {
        if (TripCategoryIndex == 0 && string.IsNullOrWhiteSpace(SelectedPrefecture))
        {
            HasValidationError = true;
            ValidationError = "Please select a prefecture.";
            return;
        }
        if (TripCategoryIndex == 1 && string.IsNullOrWhiteSpace(SelectedCountry))
        {
            HasValidationError = true;
            ValidationError = "Please select a country.";
            return;
        }
        if (string.IsNullOrWhiteSpace(Purpose))
        {
            HasValidationError = true;
            ValidationError = "Please enter a purpose.";
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
