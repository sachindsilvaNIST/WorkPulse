using System;
using System.Collections.Generic;
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
    private string _intercom = "";

    [ObservableProperty]
    private string _contactNumber = "";

    [ObservableProperty]
    private string _notes = "";

    [ObservableProperty]
    private string _windowTitle = "Add Contact";

    [ObservableProperty]
    private string _validationError = "";

    [ObservableProperty]
    private bool _hasValidationError;

    // Autocomplete suggestion lists
    public List<string> AffiliationSuggestions { get; set; } = new();
    public List<string> FamilyNameSuggestions { get; set; } = new();
    public List<string> GivenNameSuggestions { get; set; } = new();
    public List<string> DepartmentSuggestions { get; set; } = new();
    public List<string> EmailSuggestions { get; set; } = new();
    public List<string> IntercomSuggestions { get; set; } = new();
    public List<string> ContactNumberSuggestions { get; set; } = new();
    public List<string> NotesSuggestions { get; set; } = new();

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
        Intercom = record.Intercom;
        ContactNumber = record.ContactNumber;
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
            Intercom = Intercom.Trim(),
            ContactNumber = ContactNumber.Trim(),
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
