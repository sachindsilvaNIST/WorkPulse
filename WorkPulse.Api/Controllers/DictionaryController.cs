using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Services;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class DictionaryController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly AnthropicService _anthropic;

    public DictionaryController(AppDbContext db, AnthropicService anthropic)
    {
        _db = db;
        _anthropic = anthropic;
    }

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

    // ===== SRS: Spaced Repetition =====

    [HttpGet("srs/queue")]
    public async Task<ActionResult<List<DictEntryDto>>> GetSrsQueue([FromQuery] int limit = 20)
    {
        var now = DateTime.UtcNow;
        var entries = await _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .Where(e => e.UserId == UserId &&
                        (e.SrsNextReviewUtc == null || e.SrsNextReviewUtc <= now))
            .OrderBy(e => e.SrsNextReviewUtc == null ? 1 : 0)   // due cards first, new cards after
            .ThenBy(e => e.SrsNextReviewUtc)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync();

        return Ok(entries.Select(ToDto).ToList());
    }

    [HttpGet("srs/stats")]
    public async Task<ActionResult<SrsStatsDto>> GetSrsStats()
    {
        var now = DateTime.UtcNow;
        var userEntries = _db.DictionaryEntries.Where(e => e.UserId == UserId);

        var total = await userEntries.CountAsync();
        var dueNow = await userEntries.CountAsync(e => e.SrsNextReviewUtc == null || e.SrsNextReviewUtc <= now);
        var newCards = await userEntries.CountAsync(e => e.SrsNextReviewUtc == null);
        var learning = await userEntries.CountAsync(e => e.SrsRepetitions > 0 && e.SrsRepetitions < 3);
        var mature = await userEntries.CountAsync(e => e.SrsRepetitions >= 3);

        return Ok(new SrsStatsDto
        {
            Total = total,
            DueNow = dueNow,
            New = newCards,
            Learning = learning,
            Mature = mature
        });
    }

    [HttpPost("srs/review/{id}")]
    public async Task<ActionResult<DictEntryDto>> ReviewEntry(int id, [FromBody] SrsReviewDto dto)
    {
        var entry = await _db.DictionaryEntries
            .Include(e => e.EntryLabels).ThenInclude(el => el.Label)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);

        if (entry == null) return NotFound();
        if (!Enum.IsDefined(typeof(ReviewGrade), dto.Grade))
            return BadRequest(new { error = "Invalid grade (must be 1, 3, 4, or 5)." });

        SrsScheduler.ApplyReview(entry, (ReviewGrade)dto.Grade);
        await _db.SaveChangesAsync();
        return Ok(ToDto(entry));
    }

    // ===== AI: Generate example sentences =====

    [HttpPost("generate-examples")]
    public async Task<ActionResult<GenerateExamplesResponseDto>> GenerateExamples([FromBody] GenerateExamplesRequestDto dto)
    {
        if (!_anthropic.IsConfigured)
            return StatusCode(503, new { error = "AI features are not configured on the server." });

        if (string.IsNullOrWhiteSpace(dto.Japanese) || string.IsNullOrWhiteSpace(dto.Meaning))
            return BadRequest(new { error = "Japanese and Meaning are required." });

        var examples = await _anthropic.GenerateExamplesAsync(dto.Japanese, dto.Reading, dto.Meaning);
        if (examples == null || examples.Count == 0)
            return StatusCode(502, new { error = "Failed to generate examples. Please try again." });

        return Ok(new GenerateExamplesResponseDto
        {
            Examples = examples.Select(e => new DictExampleDto { Jp = e.Jp, En = e.En }).ToList()
        });
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
        SrsRepetitions = e.SrsRepetitions,
        SrsIntervalDays = e.SrsIntervalDays,
        SrsNextReviewUtc = e.SrsNextReviewUtc,
        SrsReviewCount = e.SrsReviewCount,
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
    public int SrsRepetitions { get; set; }
    public int SrsIntervalDays { get; set; }
    public DateTime? SrsNextReviewUtc { get; set; }
    public int SrsReviewCount { get; set; }
    public List<DictLabelDto> Labels { get; set; } = new();
}

public class SrsReviewDto
{
    /// <summary>1 = Again, 3 = Hard, 4 = Good, 5 = Easy</summary>
    public int Grade { get; set; }
}

public class SrsStatsDto
{
    public int Total { get; set; }
    public int DueNow { get; set; }
    public int New { get; set; }
    public int Learning { get; set; }
    public int Mature { get; set; }
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

public class GenerateExamplesRequestDto
{
    public string Japanese { get; set; } = "";
    public string? Reading { get; set; }
    public string Meaning { get; set; } = "";
}

public class GenerateExamplesResponseDto
{
    public List<DictExampleDto> Examples { get; set; } = new();
}

public class DictExampleDto
{
    public string Jp { get; set; } = "";
    public string En { get; set; } = "";
}
