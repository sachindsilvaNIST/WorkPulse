using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;

namespace WorkPulse.ViewModels;

public partial class QuickLinkEntryViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _label = "";

    [ObservableProperty]
    private string _url = "";

    [ObservableProperty]
    private string _category = "";

    [ObservableProperty]
    private string _keywords = "";

    [ObservableProperty]
    private string _windowTitle = "Add Link";

    [ObservableProperty]
    private string _validationError = "";

    [ObservableProperty]
    private bool _hasValidationError;

    public string? EditingId { get; private set; }
    public int SortOrder { get; private set; }
    public bool DialogResult { get; private set; }
    public Action? CloseAction { get; set; }

    public void LoadFromRecord(QuickLink record)
    {
        EditingId = record.Id;
        SortOrder = record.SortOrder;
        Label = record.Label;
        Url = record.Url;
        Category = record.Category;
        Keywords = record.Keywords;
        WindowTitle = $"Edit - {record.Label}";
    }

    public QuickLink ToRecord()
    {
        return new QuickLink
        {
            Id = EditingId ?? Guid.NewGuid().ToString(),
            Label = Label.Trim(),
            Url = Url.Trim(),
            Category = Category.Trim(),
            Keywords = Keywords.Trim(),
            SortOrder = SortOrder
        };
    }

    [RelayCommand]
    private void Save()
    {
        if (string.IsNullOrWhiteSpace(Label) || string.IsNullOrWhiteSpace(Url))
        {
            HasValidationError = true;
            ValidationError = "Please enter both a label and a URL.";
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
