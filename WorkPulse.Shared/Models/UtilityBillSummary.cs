namespace WorkPulse.Models;

public class UtilityBillSummary
{
    public int TotalThisMonth { get; set; }
    public int YearToDate { get; set; }
    public decimal MonthlyAverage { get; set; }
    public int UnpaidCount { get; set; }
    public int OverdueCount { get; set; }
    public UtilityBill? NextDueBill { get; set; }
}
