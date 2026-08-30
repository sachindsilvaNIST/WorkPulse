using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class QuickLinksController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public QuickLinksController(AppDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<ActionResult<List<QuickLink>>> GetAll()
    {
        var links = await _db.QuickLinks
            .Where(l => l.UserId == UserId)
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
            .ToListAsync();

        return Ok(links.Select(l => l.ToQuickLink()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<QuickLink>> Create([FromBody] QuickLink record)
    {
        var entity = record.ToEntity(UserId);
        _db.QuickLinks.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToQuickLink());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<QuickLink>> Update(string id, [FromBody] QuickLink record)
    {
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);
        if (entity == null) return NotFound();

        entity.Label = record.Label;
        entity.Url = record.Url;
        entity.Category = record.Category;
        entity.Keywords = record.Keywords;
        entity.SortOrder = record.SortOrder;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(entity.ToQuickLink());
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.QuickLinks.FirstOrDefaultAsync(l => l.Id == id && l.UserId == UserId);
        if (entity == null) return NotFound();

        _db.QuickLinks.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    public class LinkCheckResult
    {
        public string Url { get; set; } = "";
        public bool Ok { get; set; }
    }

    /// <summary>Server-side link health check — must run here rather than as a browser `fetch`
    /// from the frontend, since arbitrary third-party sites reject cross-origin requests via
    /// CORS. Ephemeral: results aren't persisted, just returned for the current check.</summary>
    [HttpPost("check")]
    public async Task<ActionResult<List<LinkCheckResult>>> CheckLinks([FromBody] List<string> urls)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(8);

        async Task<LinkCheckResult> CheckOne(string url)
        {
            var target = url.StartsWith("http://") || url.StartsWith("https://") ? url : $"https://{url}";
            try
            {
                using var headResponse = await client.SendAsync(new HttpRequestMessage(HttpMethod.Head, target));
                if (headResponse.IsSuccessStatusCode) return new LinkCheckResult { Url = url, Ok = true };

                // Some servers reject HEAD but happily serve GET — one retry before calling it broken.
                using var getResponse = await client.SendAsync(new HttpRequestMessage(HttpMethod.Get, target));
                return new LinkCheckResult { Url = url, Ok = getResponse.IsSuccessStatusCode };
            }
            catch
            {
                return new LinkCheckResult { Url = url, Ok = false };
            }
        }

        // Bounded concurrency (8 at a time) rather than firing every request at once — a bookmark
        // library can hold hundreds of links, and unbounded parallel outbound requests from the
        // server is its own problem.
        var results = new List<LinkCheckResult>();
        const int batchSize = 8;
        for (int i = 0; i < urls.Count; i += batchSize)
        {
            var batch = urls.Skip(i).Take(batchSize).Select(CheckOne);
            results.AddRange(await Task.WhenAll(batch));
        }

        return Ok(results);
    }
}
