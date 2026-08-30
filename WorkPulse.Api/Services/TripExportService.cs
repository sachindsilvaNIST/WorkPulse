using System.Text;
using ClosedXML.Excel;
using WorkPulse.Api.Data.Entities;

namespace WorkPulse.Api.Services;

/// <summary>XLSX/HTML export for a single Business Trip — a metadata summary (trip fields, then
/// each document's category/label/amount/status) rather than a bundle of the actual files, same
/// "tabular, not a zip" shape as every other export in the app.</summary>
public static class TripExportService
{
    public static MemoryStream ExportToXlsx(TripReportEntity trip, List<TripDocumentEntity> documents)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Trip");

        ws.Cell("B2").Value = $"{trip.Destination} — {trip.Category}";
        ws.Cell("B2").Style.Font.Bold = true;
        ws.Cell("B2").Style.Font.FontSize = 14;
        ws.Cell("B3").Value = $"{trip.StartDate:yyyy-MM-dd} to {trip.EndDate:yyyy-MM-dd} · {trip.Status}";
        ws.Cell("B3").Style.Font.FontColor = XLColor.FromHtml("#6E6E73");
        if (!string.IsNullOrWhiteSpace(trip.Purpose))
        {
            ws.Cell("B4").Value = trip.Purpose;
            ws.Cell("B4").Style.Font.FontColor = XLColor.FromHtml("#6E6E73");
        }

        var headers = new[] { "Category", "Label", "File", "Date", "Amount", "Currency", "Status" };
        for (int i = 0; i < headers.Length; i++)
        {
            var c = ws.Cell(6, i + 2);
            c.Value = headers[i];
            c.Style.Font.Bold = true;
            c.Style.Font.FontColor = XLColor.White;
            c.Style.Fill.BackgroundColor = XLColor.FromHtml("#0078D4");
        }
        ws.Row(6).Height = 20;

        int row = 7;
        decimal total = 0;
        foreach (var doc in documents.OrderBy(d => d.DocumentDate ?? DateOnly.FromDateTime(d.UploadedUtc)))
        {
            ws.Cell(row, 2).Value = doc.Category;
            ws.Cell(row, 3).Value = doc.Label;
            ws.Cell(row, 4).Value = doc.FileName;
            if (doc.DocumentDate.HasValue)
            {
                ws.Cell(row, 5).Value = doc.DocumentDate.Value.ToDateTime(TimeOnly.MinValue);
                ws.Cell(row, 5).Style.NumberFormat.Format = "yyyy-mm-dd";
            }
            if (doc.Amount.HasValue)
            {
                ws.Cell(row, 6).Value = doc.Amount.Value;
                ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0.00";
                total += doc.Amount.Value;
            }
            ws.Cell(row, 7).Value = doc.Currency;
            ws.Cell(row, 8).Value = doc.ReimbursementStatus;
            if ((row - 7) % 2 == 1)
                ws.Range(row, 2, row, 8).Style.Fill.BackgroundColor = XLColor.FromHtml("#F5F5F7");
            row++;
        }

        if (total > 0)
        {
            ws.Cell(row, 2).Value = "Total";
            ws.Cell(row, 2).Style.Font.Bold = true;
            ws.Cell(row, 6).Value = total;
            ws.Cell(row, 6).Style.NumberFormat.Format = "#,##0.00";
            ws.Cell(row, 6).Style.Font.Bold = true;
            ws.Range(row, 2, row, 8).Style.Border.TopBorder = XLBorderStyleValues.Thin;
        }

        ws.Range(6, 2, Math.Max(row, 6), 8).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        ws.Range(6, 2, Math.Max(row, 6), 8).Style.Border.OutsideBorderColor = XLColor.FromHtml("#E5E5E7");
        ws.Columns(2, 8).AdjustToContents();
        ws.SheetView.FreezeRows(6);

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    public static string ExportToHtml(TripReportEntity trip, List<TripDocumentEntity> documents)
    {
        var sb = new StringBuilder();
        var title = $"{trip.Destination} — {trip.Category}";
        sb.Append($"<h1>{HtmlExportService.Escape(title)}</h1>");
        sb.Append(
            $"<p class=\"meta\">{trip.StartDate:MMMM d, yyyy} to {trip.EndDate:MMMM d, yyyy} &middot; {HtmlExportService.Escape(trip.Status)}"
            + (string.IsNullOrWhiteSpace(trip.Purpose) ? "" : $" &middot; {HtmlExportService.Escape(trip.Purpose)}")
            + "</p>"
        );

        sb.Append("<table><thead><tr><th>Category</th><th>Label</th><th>File</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>");
        decimal total = 0;
        var anyAmount = false;
        foreach (var doc in documents.OrderBy(d => d.DocumentDate ?? DateOnly.FromDateTime(d.UploadedUtc)))
        {
            var amountText = doc.Amount.HasValue ? $"{doc.Amount.Value:#,0.00} {HtmlExportService.Escape(doc.Currency)}" : "";
            if (doc.Amount.HasValue)
            {
                total += doc.Amount.Value;
                anyAmount = true;
            }
            var statusClass = doc.ReimbursementStatus == "Reimbursed" ? "badge-yes" : doc.ReimbursementStatus == "Submitted" ? "badge-neutral" : "badge-no";
            sb.Append("<tr>");
            sb.Append($"<td>{HtmlExportService.Escape(doc.Category)}</td>");
            sb.Append($"<td>{HtmlExportService.Escape(doc.Label)}</td>");
            sb.Append($"<td>{HtmlExportService.Escape(doc.FileName)}</td>");
            sb.Append($"<td>{(doc.DocumentDate.HasValue ? doc.DocumentDate.Value.ToString("yyyy-MM-dd") : "")}</td>");
            sb.Append($"<td>{amountText}</td>");
            sb.Append($"<td><span class=\"badge {statusClass}\">{HtmlExportService.Escape(doc.ReimbursementStatus)}</span></td>");
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table>");

        if (anyAmount)
            sb.Append($"<p class=\"meta\" style=\"text-align:right;font-weight:700;color:#1d1d1f\">Total: {total:#,0.00}</p>");

        return HtmlExportService.WrapDocument(title, sb.ToString());
    }
}
