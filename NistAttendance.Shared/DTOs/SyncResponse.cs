using System;
using System.Collections.Generic;
using NistAttendance.Models;

namespace NistAttendance.DTOs;

public class SyncResponse
{
    public List<MonthlyData> Months { get; set; } = new();
    public ContactBookData? Contacts { get; set; }
    public AppSettings? Settings { get; set; }
    public DateTime ServerTimestamp { get; set; }
}
