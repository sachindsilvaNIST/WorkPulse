using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;

namespace NistAttendance.ViewModels;

public partial class ContactEntryViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _affiliation = "";

    [ObservableProperty]
    private string _familyName = "";

    [ObservableProperty]
    private string _givenName = "";

    [ObservableProperty]
    private string _department = "";

    [ObservableProperty]
    private string _email = "";

    [ObservableProperty]
    private string _notes = "";

    [ObservableProperty]
    private string _windowTitle = "Add Contact";

    [ObservableProperty]
    private string _validationError = "";

    [ObservableProperty]
    private bool _hasValidationError;

    public string? EditingId { get; private set; }
    public bool DialogResult { get; private set; }
    public Action? CloseAction { get; set; }

    public void LoadFromRecord(ContactRecord record)
    {
        EditingId = record.Id;
        Affiliation = record.Affiliation;
        FamilyName = record.FamilyName;
        GivenName = record.GivenName;
        Department = record.Department;
        Email = record.Email;
        Notes = record.Notes;
        WindowTitle = $"Edit - {record.FullName}";
    }

    public ContactRecord ToRecord()
    {
        return new ContactRecord
        {
            Id = EditingId ?? Guid.NewGuid().ToString(),
            Affiliation = Affiliation.Trim(),
            FamilyName = FamilyName.Trim(),
            GivenName = GivenName.Trim(),
            Department = Department.Trim(),
            Email = Email.Trim(),
            Notes = Notes.Trim()
        };
    }

    [RelayCommand]
    private void Save()
    {
        if (string.IsNullOrWhiteSpace(FamilyName) && string.IsNullOrWhiteSpace(GivenName))
        {
            HasValidationError = true;
            ValidationError = "Please enter at least a family name or given name.";
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
