using System;
using System.Collections.Generic;

namespace NistAttendance.Models;

public class FileIndexData
{
    public DateTime IndexedAt { get; set; }
    public int TotalFiles { get; set; }
    public int TotalDirectories { get; set; }
    public double IndexDurationSeconds { get; set; }
    public List<FileIndexEntry> Entries { get; set; } = new();
}
