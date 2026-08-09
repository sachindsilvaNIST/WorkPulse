using System;
using System.Collections.Generic;
using WorkPulse.Models;

namespace WorkPulse.DTOs;

public class SyncResponse
{
    public List<MonthlyData> Months { get; set; } = new();
    public ContactBookData? Contacts { get; set; }
    public List<QuickLink>? QuickLinks { get; set; }
    public List<DailyReport>? DailyReports { get; set; }
    public List<WeeklyReport>? WeeklyReports { get; set; }
    public List<TripReport>? TripReports { get; set; }
    public AppSettings? Settings { get; set; }
    public DateTime ServerTimestamp { get; set; }
}
