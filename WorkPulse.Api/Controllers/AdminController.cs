using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkPulse.Api.Data;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;

    public AdminController(UserManager<AppUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers()
    {
        var users = await _userManager.Users.ToListAsync();
        var result = new List<AdminUserDto>();

        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(new AdminUserDto
            {
                Id = user.Id,
                Email = user.Email ?? "",
                DisplayName = user.DisplayName,
                IsAdmin = roles.Contains("Admin"),
                CreatedAt = user.LockoutEnd?.UtcDateTime // Not ideal, but Identity doesn't track creation date
            });
        }

        return Ok(result);
    }

    [HttpPut("users/{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] AdminUserUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.DisplayName = dto.DisplayName;
        user.Email = dto.Email;
        user.UserName = dto.Email;
        await _userManager.UpdateAsync(user);

        // Update admin role with self-demotion + last-admin protection
        var isAdmin = (await _userManager.GetRolesAsync(user)).Contains("Admin");
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (dto.IsAdmin && !isAdmin)
        {
            await _userManager.AddToRoleAsync(user, "Admin");
        }
        else if (!dto.IsAdmin && isAdmin)
        {
            if (user.Id == currentUserId)
                return BadRequest(new { error = "You cannot remove your own admin role." });

            var admins = await _userManager.GetUsersInRoleAsync("Admin");
            if (admins.Count <= 1)
                return BadRequest(new { error = "At least one admin must remain." });

            await _userManager.RemoveFromRoleAsync(user, "Admin");
        }

        return Ok();
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Don't allow deleting yourself
        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (user.Id == currentUserId)
            return BadRequest(new { error = "Cannot delete your own account" });

        // Delete user's data first
        var months = await _db.AttendanceMonths.Where(m => m.UserId == id).ToListAsync();
        _db.AttendanceMonths.RemoveRange(months);
        var contacts = await _db.Contacts.Where(c => c.UserId == id).ToListAsync();
        _db.Contacts.RemoveRange(contacts);
        var settings = await _db.UserSettings.Where(s => s.UserId == id).ToListAsync();
        _db.UserSettings.RemoveRange(settings);
        await _db.SaveChangesAsync();

        await _userManager.DeleteAsync(user);
        return Ok();
    }

    // ===== Per-user feature flags =====

    /// <summary>Catalog of toggleable feature keys. Attendance/Settings/Home are core and not listed.</summary>
    public static readonly string[] FeatureCatalog = new[]
    {
        "calendar",
        "contacts",
        "dictionary",
        "notes",
        "notifications"
    };

    [HttpGet("users/{id}/features")]
    public async Task<ActionResult<UserFeaturesDto>> GetUserFeatures(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var disabled = (user.DisabledFeaturesCsv ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        return Ok(new UserFeaturesDto
        {
            Catalog = FeatureCatalog.ToList(),
            Disabled = disabled
        });
    }

    [HttpPut("users/{id}/features")]
    public async Task<IActionResult> UpdateUserFeatures(string id, [FromBody] UserFeaturesUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        // Only persist keys that are part of the catalog (defensive against arbitrary input)
        var sanitized = (dto.Disabled ?? new())
            .Where(k => FeatureCatalog.Contains(k))
            .Distinct()
            .ToList();

        user.DisabledFeaturesCsv = sanitized.Count == 0 ? null : string.Join(",", sanitized);
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] AdminPasswordResetDto dto)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);

        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok();
    }
}

public class AdminUserDto
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool IsAdmin { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class AdminUserUpdateDto
{
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public bool IsAdmin { get; set; }
}

public class AdminPasswordResetDto
{
    public string NewPassword { get; set; } = "";
}

public class UserFeaturesDto
{
    public List<string> Catalog { get; set; } = new();
    public List<string> Disabled { get; set; } = new();
}

public class UserFeaturesUpdateDto
{
    public List<string> Disabled { get; set; } = new();
}
