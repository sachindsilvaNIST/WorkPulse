using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using NistAttendance.Models;
using NistAttendance.Services;

namespace NistAttendance.ViewModels;

public partial class FileSearchViewModel : ViewModelBase
{
    private readonly IFileIndexService _indexService;

    [ObservableProperty]
    private string _searchText = "";

    [ObservableProperty]
    private ObservableCollection<FileIndexEntry> _searchResults = new();

    [ObservableProperty]
    private FileIndexEntry? _selectedResult;

    [ObservableProperty]
    private int _resultCount;

    [ObservableProperty]
    private string _statusMessage = "Ready";

    [ObservableProperty]
    private bool _isIndexing;

    [ObservableProperty]
    private string _indexingProgress = "";

    [ObservableProperty]
    private int _totalIndexedFiles;

    [ObservableProperty]
    private string _indexTimestamp = "";

    [ObservableProperty]
    private bool _hasNoResults;

    private IReadOnlyList<FileIndexEntry> _indexEntries = Array.Empty<FileIndexEntry>();
    private CancellationTokenSource? _indexCts;
    private CancellationTokenSource? _searchDebounce;

    public Func<string, Task>? OpenFileAction { get; set; }
    public Func<string, Task>? OpenFolderAction { get; set; }
    public Func<string, Task>? CopyToClipboardAction { get; set; }

    public FileSearchViewModel(IFileIndexService indexService)
    {
        _indexService = indexService;
    }

    public async Task InitializeAsync()
    {
        StatusMessage = "Loading index...";

        var existingIndex = await _indexService.LoadIndexAsync();
        if (existingIndex != null && existingIndex.Entries.Count > 0)
        {
            _indexEntries = existingIndex.Entries;
            TotalIndexedFiles = existingIndex.TotalFiles;
            IndexTimestamp = $"Indexed: {existingIndex.IndexedAt:yyyy-MM-dd HH:mm} ({existingIndex.TotalFiles:N0} files in {existingIndex.IndexDurationSeconds:F1}s)";
            StatusMessage = $"Index loaded: {existingIndex.TotalFiles:N0} files. Start typing to search.";
        }
        else
        {
            StatusMessage = "No database loaded. Click 'Update Database' to load.";
        }
    }

    partial void OnSearchTextChanged(string value)
    {
        _searchDebounce?.Cancel();
        _searchDebounce = new CancellationTokenSource();
        var token = _searchDebounce.Token;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(150, token);
                if (token.IsCancellationRequested) return;
                PerformSearch(value);
            }
            catch (OperationCanceledException) { }
        });
    }

    private void PerformSearch(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            Avalonia.Threading.Dispatcher.UIThread.Post(() =>
            {
                SearchResults = new ObservableCollection<FileIndexEntry>();
                ResultCount = 0;
                HasNoResults = false;
                StatusMessage = $"Index: {TotalIndexedFiles:N0} files. Start typing to search.";
            });
            return;
        }

        var sw = Stopwatch.StartNew();
        var results = _indexService.Search(_indexEntries, query);
        sw.Stop();

        Avalonia.Threading.Dispatcher.UIThread.Post(() =>
        {
            SearchResults = new ObservableCollection<FileIndexEntry>(results);
            ResultCount = results.Count;
            HasNoResults = results.Count == 0;
            StatusMessage = $"Found {results.Count:N0} results in {sw.ElapsedMilliseconds}ms";
        });
    }

    [RelayCommand]
    private void ClearSearch()
    {
        SearchText = "";
    }

    [RelayCommand]
    private async Task RefreshIndex()
    {
        if (IsIndexing) return;

        IsIndexing = true;
        _indexCts = new CancellationTokenSource();
        StatusMessage = "Loading file database...";
        IndexingProgress = "Reading...";

        try
        {
            var progress = new Progress<(int filesFound, int dirsScanned)>(p =>
            {
                Avalonia.Threading.Dispatcher.UIThread.Post(() =>
                {
                    IndexingProgress = p.dirsScanned > 0
                        ? $"Found {p.filesFound:N0} files in {p.dirsScanned:N0} directories..."
                        : $"Loaded {p.filesFound:N0} files...";
                });
            });

            var data = await _indexService.BuildIndexAsync(progress, _indexCts.Token);

            // Set in-memory index first so search works immediately
            _indexEntries = data.Entries;
            TotalIndexedFiles = data.TotalFiles;
            IndexTimestamp = $"Indexed: {data.IndexedAt:yyyy-MM-dd HH:mm} ({data.TotalFiles:N0} files in {data.IndexDurationSeconds:F1}s)";
            StatusMessage = data.TotalDirectories > 0
                ? $"Indexed: {data.TotalFiles:N0} files, {data.TotalDirectories:N0} directories in {data.IndexDurationSeconds:F1}s"
                : $"Loaded: {data.TotalFiles:N0} files in {data.IndexDurationSeconds:F1}s";

            // Save to disk in background (non-blocking)
            _ = _indexService.SaveIndexAsync(data);

            if (!string.IsNullOrWhiteSpace(SearchText))
            {
                PerformSearch(SearchText);
            }
        }
        catch (OperationCanceledException)
        {
            StatusMessage = "Indexing cancelled.";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Indexing failed: {ex.Message}";
        }
        finally
        {
            IsIndexing = false;
            IndexingProgress = "";
        }
    }

    [RelayCommand]
    private void CancelIndexing()
    {
        _indexCts?.Cancel();
    }

    [RelayCommand]
    private async Task OpenFile()
    {
        if (SelectedResult == null) return;
        if (OpenFileAction != null)
            await OpenFileAction(SelectedResult.FullPath);
    }

    [RelayCommand]
    private async Task OpenContainingFolder()
    {
        if (SelectedResult == null) return;
        if (OpenFolderAction != null)
            await OpenFolderAction(SelectedResult.DirectoryPath);
    }

    [RelayCommand]
    private async Task CopyPath()
    {
        if (SelectedResult == null) return;
        if (CopyToClipboardAction != null)
        {
            await CopyToClipboardAction(SelectedResult.FullPath);
            StatusMessage = $"Copied: {SelectedResult.FullPath}";
        }
    }
}
