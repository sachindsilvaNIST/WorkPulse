using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorkPulse.Api.Services;

namespace WorkPulse.Api.Controllers;

/// <summary>
/// Replaces the old in-process NotificationSchedulerService (a 30-minute BackgroundService loop),
/// which can't run on Lambda — there's no persistent process between invocations. An external
/// scheduler (AWS EventBridge Scheduler) calls this endpoint on the same 30-minute cadence
/// instead, the same way a real client would. Deliberately doesn't inherit ApiControllerBase
/// (which forces JWT [Authorize]) since the caller is EventBridge, not a signed-in user — access
/// is gated by a shared secret header instead.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/internal")]
public class InternalController : ControllerBase
{
    private readonly NotificationTriggerService _trigger;
    private readonly IConfiguration _config;

    public InternalController(NotificationTriggerService trigger, IConfiguration config)
    {
        _trigger = trigger;
        _config = config;
    }

    [HttpPost("run-scheduler")]
    public async Task<IActionResult> RunScheduler([FromHeader(Name = "X-Scheduler-Secret")] string? secret)
    {
        var expected = _config["Internal:SchedulerSecret"];
        if (string.IsNullOrEmpty(expected) || secret != expected)
            return Unauthorized();

        await _trigger.RunAllAsync();
        return Ok();
    }
}
