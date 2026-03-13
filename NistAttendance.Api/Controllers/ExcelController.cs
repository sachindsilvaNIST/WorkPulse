using Microsoft.AspNetCore.Mvc;
using NistAttendance.Api.Services;
using NistAttendance.Models;

namespace NistAttendance.Api.Controllers;

[Route("api/[controller]")]
public class ExcelController : ApiControllerBase
{
    [HttpPost("attendance/export")]
    public ActionResult ExportAttendance([FromBody] List<MonthlyData> months)
    {
        var stream = StreamExcelExportService.ExportAttendanceToStream(months);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "attendance.xlsx");
    }

    [HttpPost("attendance/import")]
    public async Task<ActionResult<List<MonthlyData>>> ImportAttendance(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0;

        var months = StreamExcelImportService.ImportAttendanceFromStream(stream);
        return Ok(months);
    }

    [HttpPost("contacts/export")]
    public ActionResult ExportContacts([FromBody] List<ContactRecord> contacts)
    {
        var stream = StreamExcelExportService.ExportContactsToStream(contacts);
        return File(stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contacts.xlsx");
    }
}
