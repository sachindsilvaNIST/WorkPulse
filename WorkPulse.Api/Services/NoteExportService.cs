using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;

namespace WorkPulse.Api.Services;

/// <summary>One exportable Daily/Weekly Report entry — shared shape since both report types have
/// the same fields (a date, a title, an HTML body from the rich-text editor).</summary>
public record NoteExportItem(DateOnly Date, string Title, string Body);

/// <summary>XLSX/HTML export for Daily and Weekly Reports — one shared implementation since both
/// report types export identically (Attendance's export stays separate; its record shape and
/// round-trip-import constraints are specific to it).</summary>
public static class NoteExportService
{
    public static MemoryStream ExportToXlsx(string documentTitle, List<NoteExportItem> items)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(documentTitle.Length > 31 ? documentTitle[..31] : documentTitle);

        ws.Cell("B2").Value = documentTitle;
        ws.Cell("B2").Style.Font.Bold = true;
        ws.Cell("B2").Style.Font.FontSize = 14;

        var headers = new[] { "Date", "Title", "Content" };
        for (int i = 0; i < headers.Length; i++)
        {
            var c = ws.Cell(4, i + 2);
            c.Value = headers[i];
            c.Style.Font.Bold = true;
            c.Style.Font.FontColor = XLColor.White;
            c.Style.Fill.BackgroundColor = XLColor.FromHtml("#0078D4");
        }
        ws.Row(4).Height = 20;

        int row = 5;
        foreach (var item in items.OrderBy(i => i.Date))
        {
            ws.Cell(row, 2).Value = item.Date.ToDateTime(TimeOnly.MinValue);
            ws.Cell(row, 2).Style.NumberFormat.Format = "yyyy-mm-dd";
            ws.Cell(row, 3).Value = item.Title;
            ws.Cell(row, 4).Value = StripHtml(item.Body);
            ws.Cell(row, 4).Style.Alignment.WrapText = true;
            if ((row - 5) % 2 == 1)
                ws.Range(row, 2, row, 4).Style.Fill.BackgroundColor = XLColor.FromHtml("#F5F5F7");
            row++;
        }

        ws.Range(4, 2, Math.Max(row - 1, 4), 4).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        ws.Range(4, 2, Math.Max(row - 1, 4), 4).Style.Border.OutsideBorderColor = XLColor.FromHtml("#E5E5E7");
        ws.Column(2).Width = 14;
        ws.Column(3).Width = 28;
        ws.Column(4).Width = 70;
        ws.SheetView.FreezeRows(4);

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    // Preserves rich-text formatting (bold, lists, links, ...) that the XLSX path can't — the
    // stored Body is already the rich-text editor's own HTML output, so it drops straight into
    // the shared page template rather than being stripped to plain text.
    public static string ExportToHtml(string documentTitle, List<NoteExportItem> items)
    {
        var sb = new StringBuilder();
        sb.Append($"<h1>{HtmlExportService.Escape(documentTitle)}</h1>");
        sb.Append($"<p class=\"meta\">Generated {DateTime.UtcNow:MMMM d, yyyy} &middot; {items.Count} entr{(items.Count == 1 ? "y" : "ies")}</p>");

        foreach (var item in items.OrderBy(i => i.Date))
        {
            sb.Append("<div class=\"card\">");
            sb.Append($"<h2>{HtmlExportService.Escape(string.IsNullOrWhiteSpace(item.Title) ? "Untitled" : item.Title)}</h2>");
            sb.Append($"<p class=\"card-meta\">{item.Date:MMMM d, yyyy}</p>");
            sb.Append($"<div class=\"card-body\">{item.Body}</div>");
            sb.Append("</div>");
        }

        return HtmlExportService.WrapDocument(documentTitle, sb.ToString());
    }

    private static string StripHtml(string html) => Regex.Replace(html, "<[^>]*>", " ").Trim();
}
