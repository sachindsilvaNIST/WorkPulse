using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class ContactExcelImportService
{
    public Task<List<ContactRecord>> ImportFromExcelAsync(string filePath)
    {
        var contacts = new List<ContactRecord>();

        using var workbook = new XLWorkbook(filePath);
        var ws = workbook.Worksheets.First();

        // Find the header row by scanning for "Affiliation" or "性"
        int headerRow = 0;
        for (int row = 1; row <= Math.Min(10, ws.LastRowUsed()?.RowNumber() ?? 1); row++)
        {
            for (int col = 1; col <= 10; col++)
            {
                var val = ws.Cell(row, col).GetString().Trim();
                if (val.Equals("Affiliation", StringComparison.OrdinalIgnoreCase) ||
                    val == "性")
                {
                    headerRow = row;
                    break;
                }
            }
            if (headerRow > 0) break;
        }

        if (headerRow == 0)
        {
            // Fallback: assume row 2 is headers (row 1 = title)
            headerRow = 2;
        }

        // Determine column mapping by reading headers
        int affiliationCol = 0, familyNameCol = 0, givenNameCol = 0;
        int departmentCol = 0, emailCol = 0, notesCol = 0;

        var lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 8;
        for (int col = 1; col <= lastCol; col++)
        {
            var rawHeader = ws.Cell(headerRow, col).GetString().Trim();
            var header = rawHeader.ToLowerInvariant();
            if (header.Contains("affiliation")) affiliationCol = col;
            else if (rawHeader == "性" || header.Contains("family") || header.Contains("surname")) familyNameCol = col;
            else if (rawHeader == "名" || header.Contains("given") || header.Contains("first")) givenNameCol = col;
            else if (rawHeader == "部名" || header.Contains("department")) departmentCol = col;
            else if (header.Contains("email")) emailCol = col;
            else if (header.Contains("note") || header.Contains("side")) notesCol = col;
        }

        // Fallback column positions (B=2 through G=7) if headers not found
        if (affiliationCol == 0) affiliationCol = 2;
        if (familyNameCol == 0) familyNameCol = 3;
        if (givenNameCol == 0) givenNameCol = 4;
        if (departmentCol == 0) departmentCol = 5;
        if (emailCol == 0) emailCol = 6;
        if (notesCol == 0) notesCol = 7;

        // Read data rows
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? headerRow;
        for (int row = headerRow + 1; row <= lastRow; row++)
        {
            var affiliation = ws.Cell(row, affiliationCol).GetString().Trim();
            var familyName = ws.Cell(row, familyNameCol).GetString().Trim();
            var givenName = ws.Cell(row, givenNameCol).GetString().Trim();
            var department = ws.Cell(row, departmentCol).GetString().Trim();
            var email = ws.Cell(row, emailCol).GetString().Trim();
            var notes = ws.Cell(row, notesCol).GetString().Trim();

            // Skip completely empty rows
            if (string.IsNullOrWhiteSpace(affiliation) &&
                string.IsNullOrWhiteSpace(familyName) &&
                string.IsNullOrWhiteSpace(givenName) &&
                string.IsNullOrWhiteSpace(email))
                continue;

            contacts.Add(new ContactRecord
            {
                Affiliation = affiliation,
                FamilyName = familyName,
                GivenName = givenName,
                Department = department,
                Email = email,
                Notes = notes
            });
        }

        return Task.FromResult(contacts);
    }
}
