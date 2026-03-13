using ClosedXML.Excel;
using NistAttendance.Models;

namespace NistAttendance.Api.Services;

public static class StreamExcelImportService
{
    public static List<MonthlyData> ImportAttendanceFromStream(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();
        var months = new List<MonthlyData>();
        var currentMonth = new MonthlyData();
        string currentMonthLabel = "";

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;

        for (int row = 4; row <= lastRow; row++)
        {
            var cellB = ws.Cell(row, 2).GetString().Trim();
            if (!string.IsNullOrEmpty(cellB) && cellB != currentMonthLabel)
            {
                if (currentMonth.Records.Count > 0)
                    months.Add(currentMonth);

                currentMonthLabel = cellB;
                currentMonth = new MonthlyData { MonthLabel = currentMonthLabel };
            }

            var record = TryParseRow(ws, row);
            if (record != null)
            {
                if (currentMonth.Year == 0 && record.Date.Year > 0)
                {
                    currentMonth.Year = record.Date.Year;
                    currentMonth.Month = record.Date.Month;
                }
                currentMonth.Records.Add(record);
            }
        }

        if (currentMonth.Records.Count > 0)
            months.Add(currentMonth);

        return months;
    }

    private static AttendanceRecord? TryParseRow(IXLWorksheet ws, int row)
    {
        var cellD = ws.Cell(row, 4);
        if (cellD.DataType != XLDataType.DateTime)
            return null;

        var date = DateOnly.FromDateTime(cellD.GetDateTime());
        var loginText = ws.Cell(row, 5).GetString().Trim();

        if (loginText.Contains("出張"))
        {
            return new AttendanceRecord { Date = date, DayType = DayType.BusinessTrip, HolidayName = loginText };
        }

        if (loginText.Contains("年休") || loginText.Contains("休み") || loginText.Contains("休日"))
        {
            var dayType = loginText.Contains("年休") ? DayType.AnnualPaidLeave
                : loginText.Contains("休日") ? DayType.PublicHoliday : DayType.UnpaidLeave;
            return new AttendanceRecord { Date = date, DayType = dayType, HolidayName = loginText };
        }

        if (loginText == "---")
        {
            return new AttendanceRecord { Date = date, DayType = DayType.Weekend };
        }

        var record = new AttendanceRecord { Date = date, DayType = DayType.WorkDay };

        var cellE = ws.Cell(row, 5);
        if (cellE.DataType == XLDataType.DateTime || cellE.DataType == XLDataType.TimeSpan)
        {
            var ts = cellE.DataType == XLDataType.TimeSpan ? cellE.GetTimeSpan() : cellE.GetDateTime().TimeOfDay;
            record.LoginTime = new TimeOnly(ts.Hours, ts.Minutes);
        }

        var cellF = ws.Cell(row, 6);
        if (cellF.DataType == XLDataType.DateTime || cellF.DataType == XLDataType.TimeSpan)
        {
            var ts = cellF.DataType == XLDataType.TimeSpan ? cellF.GetTimeSpan() : cellF.GetDateTime().TimeOfDay;
            record.LogoutTime = new TimeOnly(ts.Hours, ts.Minutes);
        }

        var otText = ws.Cell(row, 11).GetString().Trim().ToUpper();
        if (otText == "YES" || otText == "NO")
        {
            record.IsOvertimeDecided = true;
            record.IsOvertime = otText == "YES";
            if (record.IsOvertime)
            {
                if (int.TryParse(ws.Cell(row, 7).GetString().Trim(), out var hrs))
                    record.OvertimeHours = hrs;
                if (int.TryParse(ws.Cell(row, 9).GetString().Trim(), out var mins))
                    record.OvertimeMinutes = mins;
            }
        }

        return record;
    }
}
