using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class ExcelExportService : IExcelExportService
{
    public Task ExportToExcelAsync(List<MonthlyData> months, string filePath)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Sheet1");

        // Build title from first month
        var title = months.FirstOrDefault()?.Title ?? "MSW SETTLEMENT";
        ws.Range("C1:H2").Merge().Value = title;
        ws.Range("C1:H2").Style.Font.Bold = true;
        ws.Range("C1:H2").Style.Font.FontSize = 14;
        ws.Range("C1:H2").Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        ws.Range("C1:H2").Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

        // Headers in row 3
        ws.Cell("C3").Value = "DAY";
        ws.Cell("D3").Value = "DATE";
        ws.Cell("E3").Value = "LOGIN";
        ws.Cell("F3").Value = "LOGOUT";
        ws.Range("G3:J3").Merge().Value = "OVERTIME DURATION";
        ws.Cell("K3").Value = "OT";

        var headerRange = ws.Range("C3:K3");
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;

        int currentRow = 4;

        foreach (var monthData in months)
        {
            int monthStartRow = currentRow;

            // Group records by week
            var weekGroups = GroupByWeek(monthData.Records);

            foreach (var week in weekGroups)
            {
                foreach (var record in week)
                {
                    WriteRecordRow(ws, currentRow, record);
                    currentRow++;
                }
                // Blank row between weeks
                currentRow++;
            }

            // Merge column B for the month label
            if (currentRow > monthStartRow)
            {
                var monthRange = ws.Range(monthStartRow, 2, currentRow - 1, 2);
                monthRange.Merge().Value = monthData.MonthLabel;
                monthRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Top;
                monthRange.Style.Font.Bold = true;
            }
        }

        // Summary section
        currentRow++;
        ws.Cell(currentRow, 4).Value = "OVERTIME ";
        currentRow++;
        ws.Cell(currentRow, 4).Value = "COUNT";

        var totalOtCount = months.Sum(m => m.OvertimeCount);
        ws.Cell(currentRow, 5).Value = totalOtCount;
        currentRow++;

        ws.Cell(currentRow, 4).Value = "TOTAL DURATION";
        var totalMinutes = months.Sum(m =>
        {
            var (h, min) = m.TotalOvertimeDuration;
            return h * 60 + min;
        });
        ws.Cell(currentRow, 5).Value = $" {totalMinutes / 60} Hr";
        ws.Cell(currentRow, 6).Value = $" {totalMinutes % 60} Min";

        // Column widths
        ws.Column(2).Width = 6;
        ws.Column(3).Width = 6;
        ws.Column(4).Width = 14;
        ws.Column(5).Width = 8;
        ws.Column(6).Width = 8;
        ws.Column(7).Width = 5;
        ws.Column(8).Width = 4;
        ws.Column(9).Width = 5;
        ws.Column(10).Width = 4;
        ws.Column(11).Width = 5;

        workbook.SaveAs(filePath);
        return Task.CompletedTask;
    }

    private void WriteRecordRow(IXLWorksheet ws, int row, AttendanceRecord record)
    {
        if (record.DayType == DayType.Holiday)
        {
            ws.Range(row, 3, row, 11).Merge().Value = record.HolidayName ?? "HOLIDAY";
            ws.Range(row, 3, row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Range(row, 3, row, 11).Style.Font.Italic = true;
            return;
        }

        if (record.DayType == DayType.RestDay)
        {
            ws.Cell(row, 3).Value = record.DayAbbreviation;
            ws.Cell(row, 4).Value = record.Date.ToDateTime(TimeOnly.MinValue);
            ws.Cell(row, 4).Style.NumberFormat.Format = "yyyy-mm-dd";
            ws.Range(row, 5, row, 11).Merge().Value = "休";
            ws.Range(row, 5, row, 11).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            return;
        }

        // Normal work day
        ws.Cell(row, 3).Value = record.DayAbbreviation;
        ws.Cell(row, 4).Value = record.Date.ToDateTime(TimeOnly.MinValue);
        ws.Cell(row, 4).Style.NumberFormat.Format = "yyyy-mm-dd";

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
        {
            ws.Cell(row, 7).Value = record.OvertimeHours;
        }
        ws.Cell(row, 8).Value = "Hr";
        if (record.IsOvertime)
        {
            ws.Cell(row, 9).Value = record.OvertimeMinutes;
        }
        ws.Cell(row, 10).Value = "Min";
        ws.Cell(row, 11).Value = record.IsOvertime ? "YES" : "NO";
    }

    private static List<List<AttendanceRecord>> GroupByWeek(List<AttendanceRecord> records)
    {
        var weeks = new List<List<AttendanceRecord>>();
        var currentWeek = new List<AttendanceRecord>();

        AttendanceRecord? prev = null;
        foreach (var record in records.OrderBy(r => r.Date))
        {
            if (prev != null)
            {
                var daysBetween = record.Date.DayNumber - prev.Date.DayNumber;
                // New week if gap > 2 days (weekend gap) or if it's a Monday after other days
                if (daysBetween > 2 || (record.DayOfWeek == DayOfWeek.Monday && prev.DayOfWeek != DayOfWeek.Monday))
                {
                    if (currentWeek.Count > 0)
                    {
                        weeks.Add(currentWeek);
                        currentWeek = new List<AttendanceRecord>();
                    }
                }
            }

            currentWeek.Add(record);
            prev = record;
        }

        if (currentWeek.Count > 0)
            weeks.Add(currentWeek);

        return weeks;
    }
}
