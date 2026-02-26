using System.Collections.Generic;
using System.Threading.Tasks;
using ClosedXML.Excel;
using NistAttendance.Models;

namespace NistAttendance.Services;

public class ContactExcelExportService
{
    public Task ExportToExcelAsync(List<ContactRecord> contacts, string filePath)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.AddWorksheet("Contact Book");

        // Title row
        ws.Range(1, 1, 1, 6).Merge().Value = "NIST Contact Book";
        ws.Range(1, 1, 1, 6).Style.Font.Bold = true;
        ws.Range(1, 1, 1, 6).Style.Font.FontSize = 14;
        ws.Range(1, 1, 1, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

        // Header row
        int headerRow = 3;
        var headers = new[] { "Affiliation", "性 (Family Name)", "名 (Given Name)", "部名 (Department)", "Email ID", "Side Notes" };

        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(headerRow, i + 1).Value = headers[i];
        }

        var headerRange = ws.Range(headerRow, 1, headerRow, 6);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#0078D4");
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        headerRange.Style.Border.BottomBorder = XLBorderStyleValues.Thin;

        // Data rows
        int row = headerRow + 1;
        foreach (var contact in contacts)
        {
            ws.Cell(row, 1).Value = contact.Affiliation;
            ws.Cell(row, 2).Value = contact.FamilyName;
            ws.Cell(row, 3).Value = contact.GivenName;
            ws.Cell(row, 4).Value = contact.Department;
            ws.Cell(row, 5).Value = contact.Email;
            ws.Cell(row, 6).Value = contact.Notes;

            // Alternate row shading
            if (row % 2 == 0)
            {
                ws.Range(row, 1, row, 6).Style.Fill.BackgroundColor = XLColor.FromHtml("#F0F6FF");
            }

            row++;
        }

        // Summary row
        row++;
        ws.Cell(row, 1).Value = $"Total Contacts: {contacts.Count}";
        ws.Cell(row, 1).Style.Font.Bold = true;

        // Auto-fit column widths
        ws.Columns(1, 6).AdjustToContents();

        // Minimum column widths
        if (ws.Column(1).Width < 15) ws.Column(1).Width = 15;
        if (ws.Column(4).Width < 20) ws.Column(4).Width = 20;
        if (ws.Column(5).Width < 25) ws.Column(5).Width = 25;

        workbook.SaveAs(filePath);
        return Task.CompletedTask;
    }
}
