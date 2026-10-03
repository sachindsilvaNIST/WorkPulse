namespace WorkPulse.Models;

public class UtilityBillMonthlyChartPoint
{
    public int Year { get; set; }
    public int Month { get; set; }
    public UtilityProvider Provider { get; set; }
    public decimal Amount { get; set; }
}

public class UtilityBillUsageChartPoint
{
    public int Year { get; set; }
    public int Month { get; set; }
    public UtilityProvider Provider { get; set; }
    public decimal Usage { get; set; }
}
