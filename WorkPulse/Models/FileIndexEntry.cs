using System;
using System.IO;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

public class FileIndexEntry
{
    public string FileName { get; set; } = "";
    public string FullPath { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTime LastModified { get; set; }

    // Whether file metadata (size, date) has been resolved
    [JsonIgnore]
    public bool MetadataResolved { get; set; }

    [JsonIgnore]
    public string SizeDisplay
    {
        get
        {
            ResolveMetadataIfNeeded();
            if (SizeBytes < 0) return "—";
            if (SizeBytes < 1024) return $"{SizeBytes} B";
            if (SizeBytes < 1024 * 1024) return $"{SizeBytes / 1024.0:F1} KB";
            if (SizeBytes < 1024L * 1024 * 1024) return $"{SizeBytes / (1024.0 * 1024):F1} MB";
            return $"{SizeBytes / (1024.0 * 1024 * 1024):F2} GB";
        }
    }

    [JsonIgnore]
    public string DirectoryPath => Path.GetDirectoryName(FullPath) ?? "";

    [JsonIgnore]
    public string LastModifiedDisplay
    {
        get
        {
            ResolveMetadataIfNeeded();
            return LastModified == DateTime.MinValue ? "—" : LastModified.ToString("yyyy-MM-dd HH:mm");
        }
    }

    private void ResolveMetadataIfNeeded()
    {
        if (MetadataResolved) return;
        MetadataResolved = true;
        try
        {
            var info = new FileInfo(FullPath);
            if (info.Exists)
            {
                SizeBytes = info.Length;
                LastModified = info.LastWriteTime;
            }
            else
            {
                SizeBytes = -1;
            }
        }
        catch
        {
            SizeBytes = -1;
        }
    }
}
