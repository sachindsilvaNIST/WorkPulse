using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Mapping;
using WorkPulse.Api.Services;
using WorkPulse.Models;

namespace WorkPulse.Api.Controllers;

[Route("api/[controller]")]
public class ContactsController : ApiControllerBase
{
    private readonly AppDbContext _db;
    private readonly ShareAccessService _shareAccess;

    public ContactsController(AppDbContext db, ShareAccessService shareAccess)
    {
        _db = db;
        _shareAccess = shareAccess;
    }

    private async Task<bool> HasSharedAccessAsync(string resourceId, bool requireEdit = false)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        var permission = await _shareAccess.GetEffectivePermissionAsync("Contact", resourceId, email);
        if (permission == null) return false;
        return !requireEdit || permission == "Edit";
    }

    /// <summary>New — Contacts previously had no single-item GET at all (the page always fetched
    /// the whole list). Added specifically so a shared Contact has something to fetch; applies the
    /// exact same ownership-or-share check as everywhere else from the start, not a bare lookup.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ContactRecord>> Get(string id)
    {
        var entity = await _db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync(id)) return NotFound();
        return Ok(entity.ToContactRecord());
    }

    [HttpGet]
    public async Task<ActionResult<ContactBookData>> GetAll()
    {
        var contacts = await _db.Contacts
            .Where(c => c.UserId == UserId)
            .OrderBy(c => c.Affiliation).ThenBy(c => c.FamilyName)
            .ToListAsync();

        return Ok(new ContactBookData
        {
            Contacts = contacts.Select(c => c.ToContactRecord()).ToList()
        });
    }

    [HttpPut]
    public async Task<ActionResult> SaveAll([FromBody] ContactBookData data)
    {
        var existing = await _db.Contacts.Where(c => c.UserId == UserId).ToListAsync();
        _db.Contacts.RemoveRange(existing);

        foreach (var record in data.Contacts)
        {
            _db.Contacts.Add(record.ToEntity(UserId));
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost]
    public async Task<ActionResult<ContactRecord>> Add([FromBody] ContactRecord record)
    {
        var entity = record.ToEntity(UserId);
        _db.Contacts.Add(entity);
        await _db.SaveChangesAsync();
        return Ok(entity.ToContactRecord());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(string id, [FromBody] ContactRecord record)
    {
        var entity = await _db.Contacts.FirstOrDefaultAsync(c => c.Id == id);
        if (entity == null)
            return NotFound();
        if (entity.UserId != UserId && !await HasSharedAccessAsync(id, requireEdit: true))
            return NotFound();

        entity.Affiliation = record.Affiliation;
        entity.FamilyName = record.FamilyName;
        entity.GivenName = record.GivenName;
        entity.Department = record.Department;
        entity.Email = record.Email;
        entity.Intercom = record.Intercom;
        entity.ContactNumber = record.ContactNumber;
        entity.Notes = record.Notes;
        entity.LastModifiedUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var entity = await _db.Contacts.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (entity == null)
            return NotFound();

        _db.Contacts.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
