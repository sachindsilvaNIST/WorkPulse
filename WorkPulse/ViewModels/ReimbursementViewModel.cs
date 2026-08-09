using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using WorkPulse.Models;
using WorkPulse.Services;

namespace WorkPulse.ViewModels;

public partial class ReimbursementViewModel : ViewModelBase
{
    private readonly HttpApiClient _apiClient;

    [ObservableProperty]
    private ObservableCollection<TripDocumentWithTrip> _documents = new();

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private string _statusMessage = "";

    [ObservableProperty]
    private bool _isBusy;

    public bool IsConnected => _apiClient.IsAuthenticated;

    public Func<string, Task<string?>>? ShowSaveFileDialog { get; set; }
    public Func<string, string, Task<bool>>? ShowConfirmDialog { get; set; }

    public ReimbursementViewModel(HttpApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public async Task InitializeAsync()
    {
        if (!IsConnected)
        {
            StatusMessage = "Connect to Cloud Sync in Settings to browse your document library.";
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
            var docs = await _apiClient.GetAllDocumentsAsync(string.IsNullOrWhiteSpace(SearchText) ? null : SearchText);
            Documents = new ObservableCollection<TripDocumentWithTrip>(docs);
            StatusMessage = Documents.Count == 0 ? "No documents found." : "";
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
    private async Task Download(TripDocumentWithTrip? doc)
    {
        if (doc == null || ShowSaveFileDialog == null) return;

        var savePath = await ShowSaveFileDialog(doc.FileName);
        if (string.IsNullOrEmpty(savePath)) return;

        IsBusy = true;
        var (success, content, _, error) = await _apiClient.DownloadTripDocumentAsync(doc.TripReportId, doc.Id);
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
    private async Task Delete(TripDocumentWithTrip? doc)
    {
        if (doc == null) return;

        if (ShowConfirmDialog != null)
        {
            var confirmed = await ShowConfirmDialog("Delete Document", $"Delete \"{doc.FileName}\"?");
            if (!confirmed) return;
        }

        await _apiClient.DeleteTripDocumentAsync(doc.TripReportId, doc.Id);
        await RefreshAsync();
    }
}
