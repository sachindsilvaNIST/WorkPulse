namespace WorkPulse.Models;

/// <summary>Self-tracked (WorkPulse has no second-person approver role) — Approved and Settled
/// block deletion server-side (see TripReportsController.Delete).</summary>
public enum TripStatus
{
    Draft,
    Submitted,
    Approved,
    Settled
}
