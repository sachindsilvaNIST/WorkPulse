using WorkPulse.Api.Data.Entities;
using WorkPulse.Models;

namespace WorkPulse.Api.Services;

/// <summary>In-memory aggregation for the Utility Bills charts. Done in C# rather than a Mongo
/// pipeline because the EF Core Mongo provider can't GroupBy an unmaterialized query — and a single
/// user's bills are few enough per month that materializing them is cheap.</summary>
public static class UtilityBillAggregator
{
    public static List<UtilityBillMonthlyChartPoint> BuildMonthlyCost(IEnumerable<UtilityBillEntity> bills, bool spreadBimonthly)
    {
        var totals = new Dictionary<(int Year, int Month, UtilityProvider Provider), decimal>();

        void Add(int year, int month, UtilityProvider provider, decimal amount)
        {
            var key = (year, month, provider);
            totals[key] = totals.GetValueOrDefault(key) + amount;
        }

        foreach (var bill in bills)
        {
            var provider = ParseProvider(bill.Provider);
            if (spreadBimonthly && provider == UtilityProvider.TokyoWater)
            {
                // Water is billed every two months, so split its total evenly across the bill's own
                // month and the month before it — the two months its usage covers.
                var half = bill.AmountJpy / 2m;
                var (prevYear, prevMonth) = PreviousMonth(bill.BillingYear, bill.BillingMonth);
                Add(prevYear, prevMonth, provider, half);
                Add(bill.BillingYear, bill.BillingMonth, provider, half);
            }
            else
            {
                Add(bill.BillingYear, bill.BillingMonth, provider, bill.AmountJpy);
            }
        }

        return totals
            .OrderBy(t => t.Key.Year).ThenBy(t => t.Key.Month).ThenBy(t => t.Key.Provider)
            .Select(t => new UtilityBillMonthlyChartPoint
            {
                Year = t.Key.Year,
                Month = t.Key.Month,
                Provider = t.Key.Provider,
                Amount = t.Value
            })
            .ToList();
    }

    public static List<UtilityBillUsageChartPoint> BuildUsage(IEnumerable<UtilityBillEntity> bills) =>
        bills
            .Where(b => b.UsageAmount.HasValue)
            .OrderBy(b => b.BillingYear).ThenBy(b => b.BillingMonth)
            .Select(b => new UtilityBillUsageChartPoint
            {
                Year = b.BillingYear,
                Month = b.BillingMonth,
                Provider = ParseProvider(b.Provider),
                Usage = b.UsageAmount!.Value
            })
            .ToList();

    private static UtilityProvider ParseProvider(string value) =>
        Enum.TryParse<UtilityProvider>(value, out var p) ? p : UtilityProvider.TokyoGas;

    private static (int Year, int Month) PreviousMonth(int year, int month) =>
        month == 1 ? (year - 1, 12) : (year, month - 1);
}
