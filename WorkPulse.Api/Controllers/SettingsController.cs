using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class SettingsController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<AppSettings>> Get()
    {
        var entity = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);
        if (entity == null)
            return Ok(new AppSettings());

        return Ok(entity.ToAppSettings());
    }

    [HttpPut]
    public async Task<ActionResult> Save([FromBody] AppSettings settings)
    {
        var entity = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == UserId);

        if (entity != null)
        {
            entity.StandardLoginTime = settings.StandardLoginTime;
            entity.StandardLogoutTime = settings.StandardLogoutTime;
            entity.OvertimeBreakDeductionMinutes = settings.OvertimeBreakDeductionMinutes;
            entity.DefaultTitle = settings.DefaultTitle;
            entity.LastOpenedMonth = settings.LastOpenedMonth;
            entity.ThemeVariant = settings.ThemeVariant;
            entity.FontSizePreset = settings.FontSizePreset;
            entity.DateFormat = settings.DateFormat;
            entity.WeekStartDay = settings.WeekStartDay;
            entity.DefaultLandingPage = settings.DefaultLandingPage;
            entity.IdleTimeoutMinutes = settings.IdleTimeoutMinutes;
            entity.NotificationsEnabled = settings.NotificationsEnabled;
            entity.NotificationChannel = settings.NotificationChannel;
        }
        else
        {
            _db.UserSettings.Add(settings.ToEntity(UserId));
        }

        await _db.SaveChangesAsync();
        return Ok();
    }
}
