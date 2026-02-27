using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class FileIndexService : IFileIndexService
{
    private readonly string _indexFilePath;
    private readonly JsonSerializerOptions _jsonOptions;

    private static readonly HashSet<string> SkipDirs = new(StringComparer.Ordinal)
    {
        "/proc", "/sys", "/dev", "/run", "/snap", "/tmp"
    };

    public FileIndexService()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var folder = Path.Combine(appData, "NistAttendance");
        Directory.CreateDirectory(folder);
        _indexFilePath = Path.Combine(folder, "file_index.json");

        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = false,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new JsonStringEnumConverter() }
        };
    }

    public async Task<FileIndexData?> LoadIndexAsync()
    {
        if (!File.Exists(_indexFilePath))
            return null;

        try
        {
            await using var stream = File.OpenRead(_indexFilePath);
            return await JsonSerializer.DeserializeAsync<FileIndexData>(stream, _jsonOptions);
        }
        catch
        {
            return null;
        }
    }

    public async Task SaveIndexAsync(FileIndexData data)
    {
        var tempPath = _indexFilePath + ".tmp";
        try
        {
            await using (var stream = File.Create(tempPath))
            {
                await JsonSerializer.SerializeAsync(stream, data, _jsonOptions);
            }
            File.Move(tempPath, _indexFilePath, overwrite: true);
        }
        catch
        {
            try { File.Delete(tempPath); } catch { }
        }
    }

    public Task<FileIndexData> BuildIndexAsync(
        IProgress<(int filesFound, int dirsScanned)> progress,
        CancellationToken cancellationToken = default)
    {
        // On Linux, try locate command first (reads pre-built OS database — near instant)
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            return BuildFromLocateAsync(progress, cancellationToken);
        }

        // Windows or other: filesystem traversal
        return BuildFromTraversalAsync(progress, cancellationToken);
    }

    /// <summary>
    /// Uses the system 'locate' command to read the pre-built file database.
    /// Typically completes in 2-5 seconds for 500K+ files.
    /// </summary>
    private async Task<FileIndexData> BuildFromLocateAsync(
        IProgress<(int filesFound, int dirsScanned)> progress,
        CancellationToken cancellationToken)
    {
        var locatePath = FindLocateCommand();
        if (locatePath == null)
        {
            // locate not installed — fall back to traversal
            return await BuildFromTraversalAsync(progress, cancellationToken);
        }

        var sw = Stopwatch.StartNew();
        var entries = new List<FileIndexEntry>();
        int lineCount = 0;

        var psi = new ProcessStartInfo
        {
            FileName = locatePath,
            Arguments = "/",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(psi);
        if (process == null)
            return await BuildFromTraversalAsync(progress, cancellationToken);

        // Register cancellation to kill the process
        cancellationToken.Register(() =>
        {
            try { process.Kill(); } catch { }
        });

        using var reader = process.StandardOutput;
        while (await reader.ReadLineAsync() is { } line)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(line))
                continue;

            var fileName = Path.GetFileName(line);
            if (string.IsNullOrEmpty(fileName))
                continue;

            entries.Add(new FileIndexEntry
            {
                FileName = fileName,
                FullPath = line,
                MetadataResolved = false
            });

            lineCount++;
            if (lineCount % 10000 == 0)
            {
                progress.Report((lineCount, 0));
            }
        }

        await process.WaitForExitAsync();
        sw.Stop();

        return new FileIndexData
        {
            IndexedAt = DateTime.Now,
            TotalFiles = entries.Count,
            TotalDirectories = 0,
            IndexDurationSeconds = sw.Elapsed.TotalSeconds,
            Entries = entries
        };
    }

    private static string? FindLocateCommand()
    {
        foreach (var cmd in new[] { "plocate", "locate", "mlocate" })
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "which",
                    Arguments = cmd,
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var proc = Process.Start(psi);
                if (proc == null) continue;
                var path = proc.StandardOutput.ReadToEnd().Trim();
                proc.WaitForExit();
                if (proc.ExitCode == 0 && !string.IsNullOrEmpty(path))
                    return path;
            }
            catch { }
        }
        return null;
    }

    /// <summary>
    /// Fallback: parallel filesystem traversal (for Windows or when locate unavailable).
    /// Optimized: no stat() calls — only collects paths. Metadata resolved lazily on display.
    /// </summary>
    private Task<FileIndexData> BuildFromTraversalAsync(
        IProgress<(int filesFound, int dirsScanned)> progress,
        CancellationToken cancellationToken)
    {
        return Task.Run(() =>
        {
            var sw = Stopwatch.StartNew();
            var entries = new ConcurrentBag<FileIndexEntry>();
            int dirsScanned = 0;

            var rootPaths = GetRootPaths();

            Parallel.ForEach(rootPaths, new ParallelOptions
            {
                CancellationToken = cancellationToken,
                MaxDegreeOfParallelism = Environment.ProcessorCount
            },
            rootDir =>
            {
                TraverseDirectory(rootDir, entries, progress, ref dirsScanned, cancellationToken);
            });

            sw.Stop();

            return new FileIndexData
            {
                IndexedAt = DateTime.Now,
                TotalFiles = entries.Count,
                TotalDirectories = dirsScanned,
                IndexDurationSeconds = sw.Elapsed.TotalSeconds,
                Entries = entries.ToList()
            };
        }, cancellationToken);
    }

    private static List<string> GetRootPaths()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return DriveInfo.GetDrives()
                .Where(d => d.IsReady && d.DriveType == DriveType.Fixed)
                .Select(d => d.RootDirectory.FullName)
                .ToList();
        }

        var dirs = new List<string>();
        try
        {
            foreach (var dir in Directory.EnumerateDirectories("/"))
            {
                if (!SkipDirs.Contains(dir))
                    dirs.Add(dir);
            }
        }
        catch { }
        return dirs;
    }

    private void TraverseDirectory(
        string dirPath,
        ConcurrentBag<FileIndexEntry> entries,
        IProgress<(int filesFound, int dirsScanned)> progress,
        ref int dirsScanned,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        try
        {
            foreach (var file in Directory.EnumerateFiles(dirPath))
            {
                ct.ThrowIfCancellationRequested();
                var fileName = Path.GetFileName(file);
                if (!string.IsNullOrEmpty(fileName))
                {
                    entries.Add(new FileIndexEntry
                    {
                        FileName = fileName,
                        FullPath = file,
                        MetadataResolved = false
                    });
                }
            }
        }
        catch (UnauthorizedAccessException) { }
        catch (IOException) { }

        var currentDirs = Interlocked.Increment(ref dirsScanned);
        if (currentDirs % 500 == 0)
        {
            progress.Report((entries.Count, currentDirs));
        }

        try
        {
            foreach (var subDir in Directory.EnumerateDirectories(dirPath))
            {
                ct.ThrowIfCancellationRequested();
                if (SkipDirs.Contains(subDir))
                    continue;
                TraverseDirectory(subDir, entries, progress, ref dirsScanned, ct);
            }
        }
        catch (UnauthorizedAccessException) { }
        catch (IOException) { }
    }

    public List<FileIndexEntry> Search(IReadOnlyList<FileIndexEntry> entries, string query, int maxResults = 10000)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<FileIndexEntry>();

        var results = new List<FileIndexEntry>();

        for (int i = 0; i < entries.Count && results.Count < maxResults; i++)
        {
            if (entries[i].FileName.Contains(query, StringComparison.OrdinalIgnoreCase))
            {
                results.Add(entries[i]);
            }
        }

        return results;
    }
}
