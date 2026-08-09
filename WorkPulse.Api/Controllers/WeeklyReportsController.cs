using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class WeeklyReportsController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public WeeklyReportsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<WeeklyReport>>> GetAll([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _db.WeeklyReports.Where(r => r.UserId == UserId);

        if (from.HasValue)
            query = query.Where(r => r.WeekStartDate >= from.Value);
        if (to.HasValue)
            query = query.Where(r => r.WeekStartDate <= to.Value);

        var reports = await query.OrderByDescending(r => r.WeekStartDate).ToListAsync();
        return Ok(reports.Select(r => r.ToWeeklyReport()).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WeeklyReport>> Get(string id)
    {
        var entity = await _db.WeeklyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();
        return Ok(entity.ToWeeklyReport());
    }

    [HttpPost]
    public async Task<ActionResult<WeeklyReport>> Create([FromBody] WeeklyReport record)
    {
        var entity = record.ToEntity(UserId);
        _db.WeeklyReports.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToWeeklyReport());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<WeeklyReport>> Update(string id, [FromBody] WeeklyReport record)
    {
        var entity = await _db.WeeklyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        entity.WeekStartDate = record.WeekStartDate;
        entity.Title = record.Title;
        entity.Body = record.Body;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToWeeklyReport());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.WeeklyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        _db.WeeklyReports.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
