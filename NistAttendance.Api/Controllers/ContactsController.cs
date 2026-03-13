using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NistAttendance.Api.Data;
using NistAttendance.Api.Mapping;
using NistAttendance.Models;

namespace NistAttendance.Api.Controllers;

[Route("api/[controller]")]
public class ContactsController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public ContactsController(AppDbContext db) => _db = db;

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
        var entity = await _db.Contacts.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (entity == null)
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
        return Ok();
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
