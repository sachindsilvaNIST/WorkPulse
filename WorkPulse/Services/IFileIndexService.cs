using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IFileIndexService
{
    /// <summary>Whether the last build used locate (no JSON persistence needed).</summary>
    bool UsedLocate { get; }
    Task<FileIndexData?> LoadIndexAsync();
    Task SaveIndexAsync(FileIndexData data);
    Task<FileIndexData> BuildIndexAsync(
        IProgress<(int filesFound, int dirsScanned)> progress,
        CancellationToken cancellationToken = default);
    List<FileIndexEntry> Search(IReadOnlyList<FileIndexEntry> entries, string query, int maxResults = 10000);
}
