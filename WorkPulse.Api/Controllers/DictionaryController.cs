using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class DictionaryController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public DictionaryController(AppDbContext db) => _db = db;

    // ===== ENTRIES =====

    [HttpGet("entries")]
    public async Task<ActionResult<List<DictEntryDto>>> GetEntries([FromQuery] string? search, [FromQuery] int? labelId, [FromQuery] string? jlptLevel)
    {
        var query = _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .Where(e => e.UserId == UserId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(e =>
                e.Japanese.ToLower().Contains(q) ||
                (e.Reading != null && e.Reading.ToLower().Contains(q)) ||
                e.Meaning.ToLower().Contains(q) ||
                (e.Notes != null && e.Notes.ToLower().Contains(q)));
        }

        if (labelId.HasValue)
        {
            query = query.Where(e => e.EntryLabels.Any(el => el.LabelId == labelId.Value));
        }

        if (!string.IsNullOrWhiteSpace(jlptLevel))
        {
            query = query.Where(e => e.JlptLevel == jlptLevel);
        }

        var entries = await query
            .OrderByDescending(e => e.LastModifiedUtc)
            .ToListAsync();

        return Ok(entries.Select(ToDto).ToList());
    }

    [HttpGet("entries/{id}")]
    public async Task<ActionResult<DictEntryDto>> GetEntry(int id)
    {
        var entry = await _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);

        if (entry == null) return NotFound();
        return Ok(ToDto(entry));
    }

    [HttpPost("entries")]
    public async Task<ActionResult<DictEntryDto>> CreateEntry([FromBody] DictEntryCreateDto dto)
    {
        var entry = new DictionaryEntryEntity
        {
            UserId = UserId,
            Japanese = dto.Japanese,
            Reading = dto.Reading,
            Meaning = dto.Meaning,
            ExampleJp = dto.ExampleJp,
            ExampleEn = dto.ExampleEn,
            Notes = dto.Notes,
            JlptLevel = dto.JlptLevel
        };

        _db.DictionaryEntries.Add(entry);
        await _db.SaveChangesAsync();

        // Assign labels
        if (dto.LabelIds?.Count > 0)
        {
            foreach (var labelId in dto.LabelIds)
            {
                _db.DictionaryEntryLabels.Add(new DictionaryEntryLabelEntity
                {
                    EntryId = entry.Id,
                    LabelId = labelId
                });
            }
            await _db.SaveChangesAsync();
        }

        // Reload with labels
        var result = await _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .FirstAsync(e => e.Id == entry.Id);

        return Ok(ToDto(result));
    }

    [HttpPut("entries/{id}")]
    public async Task<ActionResult<DictEntryDto>> UpdateEntry(int id, [FromBody] DictEntryCreateDto dto)
    {
        var entry = await _db.DictionaryEntries
            .Include(e => e.EntryLabels)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);

        if (entry == null) return NotFound();

        entry.Japanese = dto.Japanese;
        entry.Reading = dto.Reading;
        entry.Meaning = dto.Meaning;
        entry.ExampleJp = dto.ExampleJp;
        entry.ExampleEn = dto.ExampleEn;
        entry.Notes = dto.Notes;
        entry.JlptLevel = dto.JlptLevel;
        entry.LastModifiedUtc = DateTime.UtcNow;

        // Update labels
        _db.DictionaryEntryLabels.RemoveRange(entry.EntryLabels);
        if (dto.LabelIds?.Count > 0)
        {
            foreach (var labelId in dto.LabelIds)
            {
                _db.DictionaryEntryLabels.Add(new DictionaryEntryLabelEntity
                {
                    EntryId = entry.Id,
                    LabelId = labelId
                });
            }
        }

        await _db.SaveChangesAsync();

        var result = await _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .FirstAsync(e => e.Id == entry.Id);

        return Ok(ToDto(result));
    }

    [HttpDelete("entries/{id}")]
    public async Task<ActionResult> DeleteEntry(int id)
    {
        var entry = await _db.DictionaryEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);

        if (entry == null) return NotFound();

        _db.DictionaryEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ===== LABELS =====

    [HttpGet("labels")]
    public async Task<ActionResult<List<DictLabelDto>>> GetLabels()
    {
        var labels = await _db.DictionaryLabels
            .Where(l => l.UserId == UserId)
            .OrderBy(l => l.Name)
            .Select(l => new DictLabelDto
            {
                Id = l.Id,
                Name = l.Name,
                Color = l.Color,
                EntryCount = l.EntryLabels.Count
            })
            .ToListAsync();

        return Ok(labels);
    }

    [HttpPost("labels")]
    public async Task<ActionResult<DictLabelDto>> CreateLabel([FromBody] DictLabelCreateDto dto)
    {
        var label = new DictionaryLabelEntity
        {
            UserId = UserId,
            Name = dto.Name,
            Color = dto.Color ?? "#0078D4"
        };

        _db.DictionaryLabels.Add(label);
        await _db.SaveChangesAsync();

        return Ok(new DictLabelDto { Id = label.Id, Name = label.Name, Color = label.Color, EntryCount = 0 });
    }

    [HttpPut("labels/{id}")]
    public async Task<ActionResult> UpdateLabel(int id, [FromBody] DictLabelCreateDto dto)
    {
        var label = await _db.DictionaryLabels
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);

        if (label == null) return NotFound();

        label.Name = dto.Name;
        if (dto.Color != null) label.Color = dto.Color;
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpDelete("labels/{id}")]
    public async Task<ActionResult> DeleteLabel(int id)
    {
        var label = await _db.DictionaryLabels
            .FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);

        if (label == null) return NotFound();

        _db.DictionaryLabels.Remove(label);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ===== DTOs =====

    private static DictEntryDto ToDto(DictionaryEntryEntity e) => new()
    {
        Id = e.Id,
        Japanese = e.Japanese,
        Reading = e.Reading,
        Meaning = e.Meaning,
        ExampleJp = e.ExampleJp,
        ExampleEn = e.ExampleEn,
        Notes = e.Notes,
        JlptLevel = e.JlptLevel,
        CreatedUtc = e.CreatedUtc,
        LastModifiedUtc = e.LastModifiedUtc,
        Labels = e.EntryLabels.Select(el => new DictLabelDto
        {
            Id = el.Label.Id,
            Name = el.Label.Name,
            Color = el.Label.Color
        }).ToList()
    };
}

// ===== DTO Classes =====

public class DictEntryDto
{
    public int Id { get; set; }
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public string? JlptLevel { get; set; }
    public DateTime CreatedUtc { get; set; }
    public DateTime LastModifiedUtc { get; set; }
    public List<DictLabelDto> Labels { get; set; } = new();
}

public class DictEntryCreateDto
{
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
    public string? ExampleJp { get; set; }
    public string? ExampleEn { get; set; }
    public string? Notes { get; set; }
    public string? JlptLevel { get; set; }
    public List<int>? LabelIds { get; set; }
}

public class DictLabelDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "#0078D4";
    public int EntryCount { get; set; }
}

public class DictLabelCreateDto
{
    public string Name { get; set; } = "";
    public string? Color { get; set; }
}
