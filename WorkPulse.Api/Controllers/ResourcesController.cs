using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

/// <summary>
/// One place to save links, files, and free-form notes for future keyword search — e.g. a visa
/// application guide found once, findable again by searching "visa" or "taiwan" months later.
/// One entity for all three types (see ResourceEntity) so browsing/search treats them as a single
/// unified pile rather than three disconnected sections.
/// </summary>
[Route("api/[controller]")]
public class ResourcesController : ApiControllerBase
{
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB, same cap as Reimbursement documents

    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;
    private readonly ILogger<ResourcesController> _logger;

    public ResourcesController(AppDbContext db, GoogleDriveService drive, ILogger<ResourcesController> logger)
    {
        _db = db;
        _drive = drive;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ResourceMeta>>> GetAll()
    {
        var resources = await _db.Resources
            .Where(r => r.UserId == UserId)
            .OrderByDescending(r => r.LastModifiedUtc)
            .ToListAsync();

        return Ok(resources.Select(r => r.ToMeta()).ToList());
    }

    [HttpPost]
    [RequestSizeLimit(MaxFileSizeBytes)]
    public async Task<ActionResult<ResourceMeta>> Create(
        [FromForm] string type,
        [FromForm] string title,
        [FromForm] string? notes,
        [FromForm] string? url,
        [FromForm] string? tags,
        [FromForm] string? keywords,
        IFormFile? file)
    {
        if (type != "Link" && type != "File" && type != "Note")
            return BadRequest(new { error = "Type must be Link, File, or Note." });

        var titleTrimmed = (title ?? "").Trim();
        if (titleTrimmed.Length == 0)
            return BadRequest(new { error = "Title is required." });

        if (type == "Link" && string.IsNullOrWhiteSpace(url))
            return BadRequest(new { error = "URL is required for a Link resource." });

        var entity = new ResourceEntity
        {
            UserId = UserId,
            Type = type,
            Title = titleTrimmed,
            Notes = notes ?? "",
            Url = type == "Link" ? url!.Trim() : null,
            Tags = tags ?? "",
            Keywords = keywords ?? "",
        };

        if (type == "File")
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "A file is required for a File resource." });
            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new { error = "File exceeds the 10 MB limit." });

            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            entity.Content = stream.ToArray();
            entity.FileName = file.FileName;
            entity.ContentType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType;
            entity.SizeBytes = file.Length;
        }

        _db.Resources.Add(entity);
        await _db.SaveChangesAsync();

        // Local bytes above are the guaranteed copy (already saved) — Drive is a best-effort
        // mirror on top of that, so a Drive hiccup never blocks the upload itself.
        if (type == "File")
        {
            try
            {
                var mirrored = await _drive.TryUploadResourceAsync(UserId, entity.FileName, entity.ContentType, entity.Content);
                if (mirrored != null)
                {
                    entity.DriveFileId = mirrored.Value.FileId;
                    entity.DriveWebViewLink = mirrored.Value.WebViewLink;
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Google Drive mirror upload failed for resource {ResourceId}", entity.Id);
            }
        }

        return Ok(entity.ToMeta());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ResourceMeta>> Update(string id, [FromBody] ResourceUpdateRequest request)
    {
        var entity = await _db.Resources.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        var titleTrimmed = (request.Title ?? "").Trim();
        if (titleTrimmed.Length == 0)
            return BadRequest(new { error = "Title is required." });
        if (entity.Type == "Link" && string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { error = "URL is required for a Link resource." });

        entity.Title = titleTrimmed;
        entity.Notes = request.Notes ?? "";
        if (entity.Type == "Link") entity.Url = request.Url!.Trim();
        entity.Tags = request.Tags ?? "";
        entity.Keywords = request.Keywords ?? "";
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToMeta());
    }

    [HttpGet("{id}/download")]
    public async Task<ActionResult> Download(string id)
    {
        var entity = await _db.Resources.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId && r.Type == "File");
        if (entity == null) return NotFound();

        return File(entity.Content, entity.ContentType, entity.FileName);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.Resources.FirstOrDefaultAsync(r => r.Id == id && r.UserId == UserId);
        if (entity == null) return NotFound();

        _db.Resources.Remove(entity);
        await _db.SaveChangesAsync();

        if (entity.DriveFileId != null)
        {
            try { await _drive.TryDeleteAsync(UserId, entity.DriveFileId); }
            catch (Exception ex) { _logger.LogWarning(ex, "Google Drive delete failed for resource {ResourceId}", entity.Id); }
        }

        return NoContent();
    }
}

public class ResourceUpdateRequest
{
    public string Title { get; set; } = "";
    public string? Notes { get; set; }
    public string? Url { get; set; }
    public string? Tags { get; set; }
    public string? Keywords { get; set; }
}
