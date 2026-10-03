namespace WorkPulse.Models;

/// <summary>Never stored — always computed from PaidDate/DueDate at read time (see
/// UtilityBillStatusCalculator in WorkPulse.Api), so it can never go stale.</summary>
public enum UtilityBillStatus
{
    Unpaid,
    Paid,
    Overdue
}
