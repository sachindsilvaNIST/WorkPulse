namespace WorkPulse.Api.Services;

/// <summary>
/// Periodically runs NotificationTriggerService. Runs only while the process is alive — on
/// Render's free tier the instance can sleep after inactivity, so a scheduled reminder may arrive
/// late if nothing else has hit the API recently. There's no external cron wired up to force
/// wake-ups; this is a known limitation of the current hosting tier, not a bug in the scheduling
/// logic itself.
/// </summary>
public class NotificationSchedulerService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationSchedulerService> _logger;

    public NotificationSchedulerService(IServiceScopeFactory scopeFactory, ILogger<NotificationSchedulerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var trigger = scope.ServiceProvider.GetRequiredService<NotificationTriggerService>();
                await trigger.RunAllAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Notification scheduler tick failed");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                // Expected on shutdown.
            }
        }
    }
}
