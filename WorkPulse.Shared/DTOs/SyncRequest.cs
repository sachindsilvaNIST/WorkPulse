using System;
using System.Collections.Generic;
using WorkPulse.Models;

namespace WorkPulse.DTOs;

public class SyncRequest
{
    public List<MonthlyData> Months { get; set; } = new();
    public ContactBookData? Contacts { get; set; }
    public AppSettings? Settings { get; set; }
    public DateTime LastSyncedAt { get; set; }
}
