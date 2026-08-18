using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.DTOs;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class AttendanceController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public AttendanceController(AppDbContext db) => _db = db;

    [HttpGet("months")]
    public async Task<ActionResult<List<YearMonthDto>>> GetAvailableMonths()
    {
        var months = await _db.AttendanceMonths
            .Where(m => m.UserId == UserId)
            .OrderByDescending(m => m.Year).ThenByDescending(m => m.Month)
            .Select(m => new { m.Year, m.Month })
            .ToListAsync();

        var result = months
            .Select(m => new YearMonthDto
            {
                Year = m.Year,
                Month = m.Month,
                Label = new DateTime(m.Year, m.Month, 1).ToString("MMMM yyyy")
            })
            .ToList();

        return Ok(result);
    }

    [HttpGet("{year}/{month}")]
    public async Task<ActionResult<MonthlyData>> GetMonth(int year, int month)
    {
        var entity = await _db.AttendanceMonths
            .Include(m => m.Records)
            .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == year && m.Month == month);

        if (entity == null)
            return NotFound();

        return Ok(entity.ToMonthlyData());
    }

    [HttpPut("{year}/{month}")]
    public async Task<ActionResult<MonthlyData>> SaveMonth(int year, int month, [FromBody] MonthlyData data)
    {
        var existing = await _db.AttendanceMonths
            .Include(m => m.Records)
            .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == year && m.Month == month);

        if (existing != null)
        {
            existing.MonthLabel = data.MonthLabel;
            existing.Title = data.Title;
            existing.LastModifiedUtc = DateTime.UtcNow;

            _db.AttendanceRecords.RemoveRange(existing.Records);
            existing.Records = data.Records.Select(r => r.ToEntity()).ToList();
        }
        else
        {
            var entity = data.ToEntity(UserId);
            _db.AttendanceMonths.Add(entity);
        }

        await _db.SaveChangesAsync();
        return Ok(data);
    }

    [HttpDelete("{year}/{month}")]
    public async Task<ActionResult> DeleteMonth(int year, int month)
    {
        var entity = await _db.AttendanceMonths
            .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == year && m.Month == month);

        if (entity == null)
            return NotFound();

        _db.AttendanceMonths.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
