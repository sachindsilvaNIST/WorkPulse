using ClosedXML.Excel;
using WorkPulse.Models;

namespace WorkPulse.Api.Services;

public static class StreamExcelExportService
{
    public static MemoryStream ExportAttendanceToStream(List<MonthlyData> months)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Sheet1");

        var title = months.FirstOrDefault()?.Title ?? "MSW SETTLEMENT";
        ws.Range("C1:H2").Merge().Value = title;
        ws.Range("C1:H2").Style.Font.Bold = true;
        ws.Range("C1:H2").Style.Font.FontSize = 14;
        ws.Range("C1:H2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        ws.Cell("C3").Value = "DAY";
        ws.Cell("D3").Value = "DATE";
        ws.Cell("E3").Value = "LOGIN";
        ws.Cell("F3").Value = "LOGOUT";
        ws.Range("G3:J3").Merge().Value = "OVERTIME DURATION";
        ws.Cell("K3").Value = "Overtime";
        ws.Range("C3:K3").Style.Font.Bold = true;
        ws.Range("C3:K3").Style.Border.BottomBorder = XLBorderStyleValues.Thin;

        int row = 4;
        foreach (var monthData in months)
        {
            foreach (var record in monthData.Records.OrderBy(r => r.Date))
            {
                WriteRecord(ws, row, record);
                row++;
            }
            row++;
        }

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
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

    private static void WriteRecord(IXLWorksheet ws, int row, AttendanceRecord record)
    {
        ws.Cell(row, 3).Value = record.DayAbbreviation;
        ws.Cell(row, 4).Value = record.Date.ToDateTime(TimeOnly.MinValue);
        ws.Cell(row, 4).Style.NumberFormat.Format = "yyyy-mm-dd";

        if (record.DayType is DayType.AnnualPaidLeave or DayType.UnpaidLeave or DayType.PublicHoliday)
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
