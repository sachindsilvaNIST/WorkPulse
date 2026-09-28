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
        // Materialize full entities first, then reshape in-memory — the Mongo EF provider
        // doesn't support Select-projections on an unmaterialized IQueryable.
        var months = await _db.AttendanceMonths
            .Where(m => m.UserId == UserId)
            .ToListAsync();

        var result = months
            .OrderByDescending(m => m.Year).ThenByDescending(m => m.Month)
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
        // Records is an embedded collection now — loads automatically with the parent, no
        // .Include() needed.
        var entity = await _db.AttendanceMonths
            .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == year && m.Month == month);

        if (entity == null)
            return NotFound();

        return Ok(entity.ToMonthlyData());
    }

    [HttpPut("{year}/{month}")]
    public async Task<ActionResult<MonthlyData>> SaveMonth(int year, int month, [FromBody] MonthlyData data)
    {
        var existing = await _db.AttendanceMonths
            .FirstOrDefaultAsync(m => m.UserId == UserId && m.Year == year && m.Month == month);

        if (existing != null)
        {
            existing.MonthLabel = data.MonthLabel;
            existing.Title = data.Title;
            existing.CustomSettlementStart = data.CustomSettlementStart;
            existing.CustomSettlementEnd = data.CustomSettlementEnd;
            existing.LastModifiedUtc = DateTime.UtcNow;

            // Wholesale-replace the embedded collection — Clear() + re-add rather than
            // reassigning the List reference outright, so EF's change tracker picks up the
            // removals correctly for an owned collection.
            existing.Records.Clear();
            foreach (var r in data.Records.Select(r => r.ToEntity()))
                existing.Records.Add(r);
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
