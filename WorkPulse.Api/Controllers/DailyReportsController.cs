using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class DailyReportsController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public DailyReportsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<DailyReport>>> GetAll([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var query = _db.DailyReports.Where(r => r.UserId == UserId);

        if (from.HasValue)
            query = query.Where(r => r.ReportDate >= from.Value);
        if (to.HasValue)
            query = query.Where(r => r.ReportDate <= to.Value);

        var reports = await query.OrderByDescending(r => r.ReportDate).ToListAsync();
        return Ok(reports.Select(r => r.ToDailyReport()).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DailyReport>> Get(string id)
    {
        var entity = await _db.DailyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();
        return Ok(entity.ToDailyReport());
    }

    [HttpPost]
    public async Task<ActionResult<DailyReport>> Create([FromBody] DailyReport record)
    {
        var entity = record.ToEntity(UserId);
        _db.DailyReports.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToDailyReport());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<DailyReport>> Update(string id, [FromBody] DailyReport record)
    {
        var entity = await _db.DailyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        entity.ReportDate = record.ReportDate;
        entity.Title = record.Title;
        entity.Body = record.Body;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToDailyReport());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.DailyReports.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        _db.DailyReports.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
