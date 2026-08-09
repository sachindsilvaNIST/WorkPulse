using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

public partial class TripDocumentsViewModel : ViewModelBase
{
    private readonly HttpApiClient _apiClient;
    private readonly string _tripId;

    [ObservableProperty]
    private string _tripDisplayName;

    [ObservableProperty]
    private ObservableCollection<TripDocumentMeta> _documents = new();

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private string _statusMessage = "";

    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private int _selectedCategoryIndex = 5; // Other

    [ObservableProperty]
    private string _label = "";

    public string[] Categories { get; } = { "Invoice", "Receipt", "FlightTicket", "Insurance", "Report", "Other" };

    public bool IsConnected => _apiClient.IsAuthenticated;

    public Func<Task<string?>>? ShowOpenFileDialog { get; set; }
    public Func<string, Task<string?>>? ShowSaveFileDialog { get; set; }
    public Func<string, string, Task<bool>>? ShowConfirmDialog { get; set; }

    public TripDocumentsViewModel(HttpApiClient apiClient, string tripId, string tripDisplayName)
    {
        _apiClient = apiClient;
        _tripId = tripId;
        _tripDisplayName = tripDisplayName;
    }

    public async Task InitializeAsync()
    {
        if (!IsConnected)
        {
            StatusMessage = "Connect to Cloud Sync in Settings to manage trip documents.";
            return;
        }

        await RefreshAsync();
    }

    [RelayCommand]
    private async Task Refresh() => await RefreshAsync();

    private async Task RefreshAsync()
    {
        IsBusy = true;
        try
        {
            var docs = await _apiClient.GetTripDocumentsAsync(_tripId, string.IsNullOrWhiteSpace(SearchText) ? null : SearchText);
            Documents = new ObservableCollection<TripDocumentMeta>(docs);
            StatusMessage = Documents.Count == 0 ? "No documents yet." : "";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to load documents: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    partial void OnSearchTextChanged(string value) => _ = RefreshAsync();

    [RelayCommand]
    private async Task Upload()
    {
        if (!IsConnected)
        {
            StatusMessage = "Connect to Cloud Sync in Settings first.";
            return;
        }
        if (ShowOpenFileDialog == null) return;

        var filePath = await ShowOpenFileDialog();
        if (string.IsNullOrEmpty(filePath)) return;

        var fileInfo = new FileInfo(filePath);
        if (fileInfo.Length > 10 * 1024 * 1024)
        {
            StatusMessage = "File exceeds the 10 MB limit.";
            return;
        }

        var category = Categories[Math.Clamp(SelectedCategoryIndex, 0, Categories.Length - 1)];
        if (!Enum.TryParse<DocCategory>(category, out var docCategory))
            docCategory = DocCategory.Other;

        IsBusy = true;
        var (success, _, error) = await _apiClient.UploadTripDocumentAsync(_tripId, filePath, docCategory, Label);
        IsBusy = false;

        if (!success)
        {
            StatusMessage = error ?? "Upload failed.";
            return;
        }

        Label = "";
        StatusMessage = "Uploaded.";
        await RefreshAsync();
    }

    [RelayCommand]
    private async Task Download(TripDocumentMeta? doc)
    {
        if (doc == null || ShowSaveFileDialog == null) return;

        var savePath = await ShowSaveFileDialog(doc.FileName);
        if (string.IsNullOrEmpty(savePath)) return;

        IsBusy = true;
        var (success, content, _, error) = await _apiClient.DownloadTripDocumentAsync(_tripId, doc.Id);
        IsBusy = false;

        if (!success || content == null)
        {
            StatusMessage = error ?? "Download failed.";
            return;
        }

        await File.WriteAllBytesAsync(savePath, content);
        StatusMessage = $"Saved to {Path.GetFileName(savePath)}";
    }

    [RelayCommand]
    private async Task Delete(TripDocumentMeta? doc)
    {
        if (doc == null) return;

        if (ShowConfirmDialog != null)
        {
            var confirmed = await ShowConfirmDialog("Delete Document", $"Delete \"{doc.FileName}\"?");
            if (!confirmed) return;
        }

        await _apiClient.DeleteTripDocumentAsync(_tripId, doc.Id);
        await RefreshAsync();
    }
}
