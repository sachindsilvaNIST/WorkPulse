using System;
using System.Collections.Generic;
using WorkPulse.Models;

namespace WorkPulse.DTOs;

public class SyncResponse
{
    public List<MonthlyData> Months { get; set; } = new();
    public ContactBookData? Contacts { get; set; }
    public AppSettings? Settings { get; set; }
    public DateTime ServerTimestamp { get; set; }
}
