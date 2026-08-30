using System.Net;

namespace WorkPulse.Api.Services;

/// <summary>Shared HTML-document shell for every export in the app (Attendance, Daily Reports,
/// Business Trips) so they share one consistent, modern look — WorkPulse's own brand-blue accent,
/// a clean sans-serif stack, striped tables — without depending on any templating library (none is
/// installed, and a document this simple doesn't warrant adding one).</summary>
public static class HtmlExportService
{
    public const string BrandBlue = "#0078d4";
    private const string TextDark = "#1d1d1f";
    private const string Muted = "#6e6e73";
    private const string Border = "#e5e5e7";
    private const string StripeBg = "#f5f5f7";

    public static string WrapDocument(string title, string bodyHtml) => $$"""
        <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{{Escape(title)}}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            color: {{TextDark}};
            margin: 0;
            padding: 40px;
            background: #ffffff;
          }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.01em; }
          .meta { color: {{Muted}}; font-size: 13px; margin: 0 0 28px; }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: {{BrandBlue}};
            margin: 32px 0 10px;
            padding-top: 24px;
            border-top: 2px solid {{BrandBlue}};
          }
          .section-title:first-of-type { margin-top: 0; padding-top: 0; border-top: none; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th {
            background: {{BrandBlue}};
            color: #ffffff;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 10px 12px;
          }
          th:first-child { border-top-left-radius: 8px; }
          th:last-child { border-top-right-radius: 8px; }
          td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid {{Border}}; }
          tr:nth-child(even) td { background: {{StripeBg}}; }
          .center { text-align: center; }
          .muted { color: {{Muted}}; }
          .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
          .badge-yes { background: rgba(16,124,16,0.14); color: #0b5c0b; }
          .badge-no { background: rgba(209,52,56,0.14); color: #a5251c; }
          .badge-neutral { background: rgba(110,110,115,0.14); color: {{Muted}}; }
          .card {
            border: 1px solid {{Border}};
            border-radius: 12px;
            padding: 18px 20px;
            margin-bottom: 16px;
          }
          .card h2 { font-size: 15px; margin: 0 0 2px; }
          .card .card-meta { color: {{Muted}}; font-size: 12px; margin: 0 0 12px; }
          .card .card-body { font-size: 13px; line-height: 1.6; }
          .card .card-body p { margin: 0 0 10px; }
        </style>
        </head>
        <body>
        {{bodyHtml}}
        </body>
        </html>
        """;

    public static string Escape(string? s) => WebUtility.HtmlEncode(s ?? "");
}
