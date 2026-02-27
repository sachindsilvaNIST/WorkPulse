using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class ContactBookDashboardViewModel : ViewModelBase
{
    private readonly IContactDataService _dataService;

    [ObservableProperty]
    private ObservableCollection<ContactRecord> _filteredContacts = new();

    [ObservableProperty]
    private ContactRecord? _selectedContact;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private int _totalContacts;

    [ObservableProperty]
    private bool _hasNoSearchResults;

    [ObservableProperty]
    private string _statusMessage = "Ready";

    [ObservableProperty]
    private bool _isEditMode;

    [ObservableProperty]
    private string _editModeButtonText = "Edit";

    private ContactBookData? _data;

    public ContactBookDashboardViewModel(IContactDataService dataService)
    {
        _dataService = dataService;
    }

    public async Task InitializeAsync()
    {
        _data = await _dataService.LoadContactsAsync();
        RefreshDisplay();
    }

    partial void OnSearchTextChanged(string value)
    {
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        if (string.IsNullOrWhiteSpace(SearchText))
        {
            FilteredContacts = new ObservableCollection<ContactRecord>(
                _data?.Contacts.OrderBy(c => c.FamilyName) ?? Enumerable.Empty<ContactRecord>());
        }
        else
        {
            var lower = SearchText.ToLowerInvariant();
            FilteredContacts = new ObservableCollection<ContactRecord>(
                (_data?.Contacts ?? Enumerable.Empty<ContactRecord>())
                    .Where(c => c.SearchText.Contains(lower))
                    .OrderBy(c => c.FamilyName));
        }
        TotalContacts = FilteredContacts.Count;
        HasNoSearchResults = FilteredContacts.Count == 0 && !string.IsNullOrWhiteSpace(SearchText);
    }

    [RelayCommand]
    private void ClearSearch()
    {
        SearchText = "";
    }

    [RelayCommand]
    private void ToggleEditMode()
    {
        IsEditMode = !IsEditMode;
        EditModeButtonText = IsEditMode ? "Done" : "Edit";
        StatusMessage = IsEditMode
            ? "EDIT MODE - Add, modify, or delete contacts."
            : "View mode.";
    }

    public async Task AddContact(ContactRecord contact)
    {
        _data ??= new ContactBookData();
        _data.Contacts.Add(contact);
        await SaveAndRefresh();
        StatusMessage = $"Added contact: {contact.FullName}";
    }

    public async Task UpdateContact(ContactRecord updated)
    {
        if (_data == null) return;
        var existing = _data.Contacts.FirstOrDefault(c => c.Id == updated.Id);
        if (existing != null)
        {
            _data.Contacts.Remove(existing);
            _data.Contacts.Add(updated);
            await SaveAndRefresh();
            StatusMessage = $"Updated contact: {updated.FullName}";
        }
    }

    public async Task DeleteContact(ContactRecord contact)
    {
        if (_data == null) return;
        var existing = _data.Contacts.FirstOrDefault(c => c.Id == contact.Id);
        if (existing != null)
        {
            _data.Contacts.Remove(existing);
            await SaveAndRefresh();
            StatusMessage = $"Deleted contact: {contact.FullName}";
        }
    }

    public async Task ImportContacts(List<ContactRecord> imported)
    {
        _data ??= new ContactBookData();
        _data.Contacts.AddRange(imported);
        await SaveAndRefresh();
        StatusMessage = $"Imported {imported.Count} contacts.";
    }

    public List<ContactRecord> GetAllContacts()
        => _data?.Contacts.OrderBy(c => c.FamilyName).ToList() ?? new List<ContactRecord>();

    public List<string> GetDistinctValues(Func<ContactRecord, string> selector)
        => (_data?.Contacts ?? Enumerable.Empty<ContactRecord>())
            .Select(selector)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct()
            .OrderBy(v => v)
            .ToList();

    private async Task SaveAndRefresh()
    {
        if (_data != null)
            await _dataService.SaveContactsAsync(_data);
        RefreshDisplay();
    }

    private void RefreshDisplay()
    {
        ApplyFilter();
    }
}
