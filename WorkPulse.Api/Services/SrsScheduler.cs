using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Services;

public enum ReviewGrade { Again = 1, Hard = 3, Good = 4, Easy = 5 }

/// <summary>
/// Simplified SM-2 scheduler.
/// - Again: resets progress, card reappears ~10 min later (but we store it as 0-day interval = due now)
/// - Hard:  small interval bump, ease factor penalty
/// - Good:  standard SM-2 progression
/// - Easy:  larger interval bump, ease factor bonus
/// </summary>
public static class SrsScheduler
{
    private const double MinEase = 1.3;
    private const double InitialEase = 2.5;

    public static void ApplyReview(DictionaryEntryEntity entry, ReviewGrade grade)
    {
        var now = DateTime.UtcNow;
        entry.SrsLastReviewUtc = now;
        entry.SrsReviewCount++;

        var ease = entry.SrsEaseFactor <= 0 ? InitialEase : entry.SrsEaseFactor;
        int newInterval;
        int newReps = entry.SrsRepetitions;

        if (grade == ReviewGrade.Again)
        {
            // Failed - reset but show it again very soon
            newReps = 0;
            newInterval = 0; // Due immediately (same session)
            ease = Math.Max(MinEase, ease - 0.2);
        }
        else
        {
            // Successful review
            newReps++;

            if (newReps == 1)
            {
                newInterval = 1; // 1 day
            }
            else if (newReps == 2)
            {
                newInterval = grade == ReviewGrade.Easy ? 4 : 3;
            }
            else
            {
                var prev = Math.Max(1, entry.SrsIntervalDays);
                var multiplier = grade switch
                {
                    ReviewGrade.Hard => 1.2,
                    ReviewGrade.Good => ease,
                    ReviewGrade.Easy => ease * 1.3,
                    _ => 1.0
                };
                newInterval = (int)Math.Ceiling(prev * multiplier);
            }

            // Adjust ease factor
            ease = grade switch
            {
                ReviewGrade.Hard => Math.Max(MinEase, ease - 0.15),
                ReviewGrade.Good => ease,
                ReviewGrade.Easy => ease + 0.15,
                _ => ease
            };
        }

        entry.SrsRepetitions = newReps;
        entry.SrsIntervalDays = newInterval;
        entry.SrsEaseFactor = ease;
        entry.SrsNextReviewUtc = newInterval == 0 ? now : now.AddDays(newInterval);
    }
}
