using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class ExcelImportService : IExcelImportService
{
    private static readonly HashSet<string> DayAbbreviations = new(StringComparer.OrdinalIgnoreCase)
    {
        "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"
    };

    public Task<List<MonthlyData>> ImportFromExcelAsync(string filePath)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheets.First();

        // Read title from row 1
        var title = worksheet.Cell("C1").GetString().Trim();

        // Find month sections by scanning column B for month labels
        var monthSections = FindMonthSections(worksheet);

        var results = new List<MonthlyData>();

        foreach (var section in monthSections)
        {
            var monthlyData = new MonthlyData
            {
                Year = section.Year,
                Month = section.Month,
                MonthLabel = section.Label,
                Title = $"{CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(section.Month).ToUpper()} - {ExtractTitleSuffix(title)}"
            };

            // Parse records in this month's row range
            for (int row = section.StartRow; row <= section.EndRow; row++)
            {
                var record = TryParseRow(worksheet, row);
                if (record != null)
                    monthlyData.Records.Add(record);
            }

            // Sort records by date
            monthlyData.Records = monthlyData.Records.OrderBy(r => r.Date).ToList();

            if (monthlyData.Records.Count > 0)
                results.Add(monthlyData);
        }

        return Task.FromResult(results);
    }

    private static string ExtractTitleSuffix(string title)
    {
        // Extract the part after the month name, e.g. "DECEMBER - MSW SETTLEMENT" -> "MSW SETTLEMENT"
        var dashIndex = title.IndexOf('-');
        if (dashIndex >= 0 && dashIndex + 1 < title.Length)
            return title[(dashIndex + 1)..].Trim();
        return "MSW SETTLEMENT";
    }

    private List<MonthSection> FindMonthSections(IXLWorksheet ws)
    {
        var sections = new List<MonthSection>();
        var mergedRanges = ws.MergedRanges
            .Where(r => r.FirstCell().Address.ColumnNumber == 2) // Column B
            .ToList();

        foreach (var range in mergedRanges)
        {
            var label = range.FirstCell().GetString().Trim().ToUpper();
            if (string.IsNullOrEmpty(label)) continue;

            var (year, month) = ParseMonthLabel(label, ws);
            if (month == 0) continue;

            sections.Add(new MonthSection
            {
                Label = label,
                Year = year,
                Month = month,
                StartRow = range.FirstRow().RowNumber(),
                EndRow = range.LastRow().RowNumber()
            });
        }

        // If no merged ranges found in column B, try scanning all rows
        if (sections.Count == 0)
        {
            sections = ScanForMonthSections(ws);
        }

        return sections;
    }

    private List<MonthSection> ScanForMonthSections(IXLWorksheet ws)
    {
        var sections = new List<MonthSection>();
        for (int row = 1; row <= ws.LastRowUsed()?.RowNumber(); row++)
        {
            var cellB = ws.Cell(row, 2).GetString().Trim().ToUpper();
            if (!string.IsNullOrEmpty(cellB))
            {
                var (year, month) = ParseMonthLabel(cellB, ws);
                if (month > 0)
                {
                    // Find the extent of this section (until next month label or end)
                    int endRow = ws.LastRowUsed()?.RowNumber() ?? row;
                    sections.Add(new MonthSection
                    {
                        Label = cellB,
                        Year = year,
                        Month = month,
                        StartRow = row,
                        EndRow = endRow
                    });
                }
            }
        }

        // Adjust end rows so sections don't overlap
        for (int i = 0; i < sections.Count - 1; i++)
        {
            sections[i].EndRow = sections[i + 1].StartRow - 1;
        }

        return sections;
    }

    private static (int Year, int Month) ParseMonthLabel(string label, IXLWorksheet ws)
    {
        var monthMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["JAN"] = 1, ["FEB"] = 2, ["MAR"] = 3, ["APR"] = 4,
            ["MAY"] = 5, ["JUN"] = 6, ["JUL"] = 7, ["AUG"] = 8,
            ["SEP"] = 9, ["OCT"] = 10, ["NOV"] = 11, ["DEC"] = 12
        };

        if (!monthMap.TryGetValue(label, out var month))
            return (0, 0);

        // Try to determine year from date cells in the worksheet
        int year = DateTime.Now.Year;
        foreach (var row in Enumerable.Range(1, ws.LastRowUsed()?.RowNumber() ?? 0))
        {
            var cellD = ws.Cell(row, 4); // Column D = dates
            if (cellD.DataType == XLDataType.DateTime)
            {
                var date = cellD.GetDateTime();
                if (date.Month == month)
                {
                    year = date.Year;
                    break;
                }
            }
        }

        return (year, month);
    }

    private AttendanceRecord? TryParseRow(IXLWorksheet ws, int row)
    {
        var cellC = ws.Cell(row, 3); // DAY column
        var cellD = ws.Cell(row, 4); // DATE column
        var cellE = ws.Cell(row, 5); // LOGIN column

        var dayText = cellC.GetString().Trim().ToUpper();
        var loginText = cellE.GetString().Trim();

        // Check for weekend/rest day (Saturday/Sunday with 休 or 土・日曜日)
        if (loginText == "休" || loginText.Contains("休") || loginText.Contains("土・日曜日"))
        {
            if (cellD.DataType == XLDataType.DateTime)
            {
                return new AttendanceRecord
                {
                    Date = DateOnly.FromDateTime(cellD.GetDateTime()),
                    DayType = DayType.Weekend
                };
            }
            return null;
        }

        // Check for holiday/leave (text in column C that's not a day abbreviation)
        if (!string.IsNullOrEmpty(dayText) && !DayAbbreviations.Contains(dayText)
            && !dayText.Contains("OVERTIME") && !dayText.Contains("COUNT")
            && !dayText.Contains("TOTAL"))
        {
            // Determine leave type from text
            var dayType = DayType.PublicHoliday;
            if (dayText.Contains("年休"))
                dayType = DayType.AnnualPaidLeave;
            else if (dayText.Contains("休み"))
                dayType = DayType.UnpaidLeave;

            return new AttendanceRecord
            {
                DayType = dayType,
                HolidayName = CultureInfo.InvariantCulture.TextInfo.ToTitleCase(dayText.ToLower()),
                Date = GuessHolidayDate(ws, row)
            };
        }

        // Check for normal work day: must have day abbreviation AND a date
        if (!DayAbbreviations.Contains(dayText))
            return null;

        if (cellD.DataType != XLDataType.DateTime)
            return null;

        var date = DateOnly.FromDateTime(cellD.GetDateTime());
        var record = new AttendanceRecord
        {
            Date = date,
            DayType = DayType.WorkDay
        };

        // Parse login time
        if (cellE.DataType == XLDataType.DateTime)
        {
            var loginDt = cellE.GetDateTime();
            record.LoginTime = new TimeOnly(loginDt.Hour, loginDt.Minute);
        }

        // Parse logout time
        var cellF = ws.Cell(row, 6);
        if (cellF.DataType == XLDataType.DateTime)
        {
            var logoutDt = cellF.GetDateTime();
            record.LogoutTime = new TimeOnly(logoutDt.Hour, logoutDt.Minute);
        }

        // Parse overtime
        var cellG = ws.Cell(row, 7); // OT hours
        var cellI = ws.Cell(row, 9); // OT minutes
        var cellK = ws.Cell(row, 11); // OT flag

        if (cellG.DataType == XLDataType.Number)
            record.OvertimeHours = (int)cellG.GetDouble();
        if (cellI.DataType == XLDataType.Number)
            record.OvertimeMinutes = (int)cellI.GetDouble();

        var otFlag = cellK.GetString().Trim().ToUpper();
        record.IsOvertime = otFlag == "YES";
        record.IsOvertimeDecided = otFlag == "YES" || otFlag == "NO";

        return record;
    }

    private static DateOnly GuessHolidayDate(IXLWorksheet ws, int row)
    {
        // Look at nearby rows (before and after) to find dates for context
        for (int offset = 1; offset <= 10; offset++)
        {
            // Check row before
            if (row - offset >= 1)
            {
                var cell = ws.Cell(row - offset, 4);
                if (cell.DataType == XLDataType.DateTime)
                {
                    var dt = cell.GetDateTime();
                    return DateOnly.FromDateTime(dt.AddDays(offset));
                }
            }
            // Check row after
            var lastRow = ws.LastRowUsed()?.RowNumber() ?? row;
            if (row + offset <= lastRow)
            {
                var cell = ws.Cell(row + offset, 4);
                if (cell.DataType == XLDataType.DateTime)
                {
                    var dt = cell.GetDateTime();
                    return DateOnly.FromDateTime(dt.AddDays(-offset));
                }
            }
        }

        return DateOnly.FromDateTime(DateTime.Today);
    }

    private class MonthSection
    {
        public string Label { get; set; } = "";
        public int Year { get; set; }
        public int Month { get; set; }
        public int StartRow { get; set; }
        public int EndRow { get; set; }
    }
}
