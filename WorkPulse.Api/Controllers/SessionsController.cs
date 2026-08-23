using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;

namespace WorkPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SessionsController(AppDbContext db) => _db = db;

    private string UserId => User.FindFirst(ClaimTypes.NameIdentifier)!.Value;

    [HttpGet]
    public async Task<ActionResult<List<SessionDto>>> GetSessions()
    {
        var sessions = await _db.UserSessions
            .Where(s => s.UserId == UserId)
            .OrderByDescending(s => s.LastUsedUtc)
            .Select(s => new SessionDto
            {
                Id = s.Id,
                DeviceLabel = s.DeviceLabel,
                IpAddress = s.IpAddress,
                CreatedUtc = s.CreatedUtc,
                LastUsedUtc = s.LastUsedUtc
            })
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeSession(int id)
    {
        var session = await _db.UserSessions.FirstOrDefaultAsync(s => s.Id == id && s.UserId == UserId);
        if (session == null) return NotFound();

        _db.UserSessions.Remove(session);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete]
    public async Task<IActionResult> RevokeAllSessions()
    {
        var sessions = await _db.UserSessions.Where(s => s.UserId == UserId).ToListAsync();
        _db.UserSessions.RemoveRange(sessions);
        await _db.SaveChangesAsync();
        return Ok();
    }
}

public class SessionDto
{
    public int Id { get; set; }
    public string DeviceLabel { get; set; } = "";
    public string? IpAddress { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastUsedUtc { get; set; }
}
