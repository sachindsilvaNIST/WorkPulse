using System.Text;
using ClosedXML.Excel;
using WorkPulse.Models;

namespace WorkPulse.Api.Services;

public static class StreamExcelExportService
{
    private static readonly XLColor HeaderFill = XLColor.FromHtml("#0078D4");
    private static readonly XLColor DividerFill = XLColor.FromHtml("#DCEEFF");
    private static readonly XLColor StripeFill = XLColor.FromHtml("#F5F5F7");
    private static readonly XLColor BorderColor = XLColor.FromHtml("#E5E5E7");

    public static MemoryStream ExportAttendanceToStream(List<MonthlyData> months)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Attendance");

        var title = months.Count == 1 ? months[0].Title : "Attendance Export";
        ws.Range("C1:H2").Merge().Value = title;
        ws.Range("C1:H2").Style.Font.Bold = true;
        ws.Range("C1:H2").Style.Font.FontSize = 14;
        ws.Range("C1:H2").Style.Font.FontColor = XLColor.FromHtml("#1D1D1F");
        ws.Range("C1:H2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Cell("C3").Value = "DAY";
        ws.Cell("D3").Value = "DATE";
        ws.Cell("E3").Value = "LOGIN";
        ws.Cell("F3").Value = "LOGOUT";
        ws.Range("G3:J3").Merge().Value = "OVERTIME DURATION";
        ws.Cell("K3").Value = "Overtime";
        var headerRange = ws.Range("C3:K3");
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = HeaderFill;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        ws.Row(3).Height = 20;

        int row = 4;
        foreach (var monthData in months)
        {
            // Multi-month divider row, also the key that makes round-trip import correctly split
            // this back into separate months — the importer (StreamExcelImportService) already
            // groups rows by column B whenever it changes, a mechanism that previously went
            // unused since nothing ever wrote to column B. Every data row below gets the same
            // label written into column B, so multiple months in one export come back as multiple
            // MonthlyData entries on import instead of merging into one.
            var dividerRange = ws.Range(row, 3, row, 11).Merge();
            dividerRange.Value = monthData.Title;
            dividerRange.Style.Font.Bold = true;
            dividerRange.Style.Fill.BackgroundColor = DividerFill;
            dividerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
            ws.Row(row).Height = 20;
            row++;

            var monthKey = $"{monthData.Year:D4}-{monthData.Month:D2}";
            var stripe = false;
            foreach (var record in monthData.Records.OrderBy(r => r.Date))
            {
                WriteRecord(ws, row, record, monthKey, stripe);
                stripe = !stripe;
                row++;
            }
            row++;
        }

        var dataRange = ws.Range(4, 2, Math.Max(row - 1, 4), 11);
        dataRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        dataRange.Style.Border.OutsideBorderColor = BorderColor;

        ws.Column(3).Width = 8;
        ws.Column(4).Width = 12;
        ws.Column(5).Width = 10;
        ws.Column(6).Width = 10;
        ws.Column(7).Width = 6;
        ws.Column(8).Width = 6;
        ws.Column(9).Width = 6;
        ws.Column(10).Width = 6;
        ws.Column(11).Width = 10;
        ws.SheetView.FreezeRows(3);

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    public static string ExportAttendanceToHtml(List<MonthlyData> months)
    {
        var sb = new StringBuilder();
        sb.Append("<h1>Attendance Export</h1>");
        sb.Append($"<p class=\"meta\">Generated {DateTime.UtcNow:MMMM d, yyyy}</p>");

        foreach (var month in months)
        {
            sb.Append($"<div class=\"section-title\">{HtmlExportService.Escape(month.Title)}</div>");
            sb.Append("<table><thead><tr><th>Day</th><th>Date</th><th>Login</th><th>Logout</th><th>Overtime</th><th>Status</th></tr></thead><tbody>");
            foreach (var record in month.Records.OrderBy(r => r.Date))
                sb.Append(RenderAttendanceRow(record));
            sb.Append("</tbody></table>");
        }

        return HtmlExportService.WrapDocument("Attendance Export", sb.ToString());
    }

    private static string RenderAttendanceRow(AttendanceRecord r)
    {
        string Esc(string? s) => HtmlExportService.Escape(s);

        if (r.DayType != DayType.WorkDay)
        {
            var fill = r.DayType == DayType.BusinessTrip ? " style=\"background:#DCEEFF\"" : "";
            return $"<tr{fill}><td>{Esc(r.DayAbbreviation)}</td><td>{r.Date:yyyy-MM-dd}</td>"
                 + $"<td colspan=\"4\" class=\"center\">{Esc(r.LoginDisplay)}</td></tr>";
        }

        var otBadge = r.IsOvertimeDecided
            ? $"<span class=\"badge {(r.IsOvertime ? "badge-yes" : "badge-no")}\">{(r.IsOvertime ? "YES" : "NO")}</span>"
            : "<span class=\"badge badge-neutral\">—</span>";
        var otDuration = r.IsOvertime ? $"{r.OvertimeHours}h {r.OvertimeMinutes}m" : "";

        return "<tr>"
             + $"<td>{Esc(r.DayAbbreviation)}</td>"
             + $"<td>{r.Date:yyyy-MM-dd}</td>"
             + $"<td>{Esc(r.LoginDisplay)}</td>"
             + $"<td>{Esc(r.LogoutDisplay)}</td>"
             + $"<td class=\"muted\">{Esc(otDuration)}</td>"
             + $"<td>{otBadge}</td>"
             + "</tr>";
    }

    public static MemoryStream ExportContactsToStream(List<ContactRecord> contacts)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Contacts");

        ws.Cell("B2").Value = "Contact Book";
        ws.Cell("B2").Style.Font.Bold = true;
        ws.Cell("B2").Style.Font.FontSize = 14;

        var headers = new[] { "Affiliation", "Family Name", "Given Name", "Department", "Email", "Intercom", "Contact Number", "Notes" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(4, i + 2).Value = headers[i];
            ws.Cell(4, i + 2).Style.Font.Bold = true;
        }

        int row = 5;
        foreach (var c in contacts)
        {
            ws.Cell(row, 2).Value = c.Affiliation;
            ws.Cell(row, 3).Value = c.FamilyName;
            ws.Cell(row, 4).Value = c.GivenName;
            ws.Cell(row, 5).Value = c.Department;
            ws.Cell(row, 6).Value = c.Email;
            ws.Cell(row, 7).Value = c.Intercom;
            ws.Cell(row, 8).Value = c.ContactNumber;
            ws.Cell(row, 9).Value = c.Notes;
            row++;
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    private static void WriteRecord(IXLWorksheet ws, int row, AttendanceRecord record, string monthKey, bool stripe)
    {
        ws.Cell(row, 2).Value = monthKey;
        ws.Cell(row, 3).Value = record.DayAbbreviation;
        ws.Cell(row, 4).Value = record.Date.ToDateTime(TimeOnly.MinValue);
        ws.Cell(row, 4).Style.NumberFormat.Format = "yyyy-mm-dd";

        if (stripe)
            ws.Range(row, 3, row, 11).Style.Fill.BackgroundColor = StripeFill;

        if (record.DayType is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday
            or DayType.HourlyLeave or DayType.Other)
        {
            ws.Range(row, 5, row, 11).Merge().Value = record.LoginDisplay;
            ws.Range(row, 5, row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Range(row, 5, row, 11).Style.Font.Italic = true;
            return;
        }

        if (record.DayType == DayType.BusinessTrip)
        {
            ws.Range(row, 5, row, 11).Merge().Value = record.LoginDisplay;
            ws.Range(row, 5, row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Range(row, 5, row, 11).Style.Fill.BackgroundColor = XLColor.FromHtml("#DCEBFF");
            return;
        }

        if (record.DayType == DayType.Weekend)
        {
            ws.Range(row, 5, row, 11).Merge().Value = "---";
            ws.Range(row, 5, row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            return;
        }

        if (record.LoginTime.HasValue)
        {
            ws.Cell(row, 5).Value = record.LoginTime.Value.ToTimeSpan();
            ws.Cell(row, 5).Style.NumberFormat.Format = "h:mm";
        }
        if (record.LogoutTime.HasValue)
        {
            ws.Cell(row, 6).Value = record.LogoutTime.Value.ToTimeSpan();
            ws.Cell(row, 6).Style.NumberFormat.Format = "h:mm";
        }
        if (record.IsOvertime)
            ws.Cell(row, 7).Value = record.OvertimeHours;
        ws.Cell(row, 8).Value = "Hr";
        if (record.IsOvertime)
            ws.Cell(row, 9).Value = record.OvertimeMinutes;
        ws.Cell(row, 10).Value = "Min";

        if (record.IsOvertimeDecided)
        {
            var otCell = ws.Cell(row, 11);
            otCell.Value = record.IsOvertime ? "YES" : "NO";
            otCell.Style.Font.Bold = true;
            otCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            otCell.Style.Fill.BackgroundColor = record.IsOvertime
                ? XLColor.FromHtml("#107C10") : XLColor.FromHtml("#D13438");
            otCell.Style.Font.FontColor = XLColor.White;
        }
    }
}
