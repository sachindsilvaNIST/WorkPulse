using System;
using System.Collections.Generic;
using System.Net;
using System.Text.RegularExpressions;
using WorkPulse.Models;

namespace WorkPulse.Utilities;

/// <summary>
/// Parses the Netscape Bookmark File Format (the .html file every browser, including
/// Chrome, produces from "Export bookmarks"). Folder names become the bookmark's Category.
/// </summary>
public static class BookmarkImportParser
{
    private static readonly Regex TokenRegex = new(
        @"<H3[^>]*>(?<folder>.*?)</H3>|<A\s+[^>]*HREF=""(?<url>[^""]*)""[^>]*>(?<label>.*?)</A>|(?<dlopen><DL>)|(?<dlclose></DL>)",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    public static List<QuickLink> Parse(string html)
    {
        var results = new List<QuickLink>();
        var folderStack = new Stack<string>();
        string? pendingFolder = null;

        foreach (Match m in TokenRegex.Matches(html))
        {
            if (m.Groups["folder"].Success)
            {
                pendingFolder = WebUtility.HtmlDecode(m.Groups["folder"].Value).Trim();
            }
            else if (m.Groups["dlopen"].Success)
            {
                if (pendingFolder != null)
                {
                    folderStack.Push(pendingFolder);
                    pendingFolder = null;
                }
            }
            else if (m.Groups["dlclose"].Success)
            {
                if (folderStack.Count > 0) folderStack.Pop();
            }
            else if (m.Groups["url"].Success)
            {
                var url = WebUtility.HtmlDecode(m.Groups["url"].Value).Trim();
                var label = WebUtility.HtmlDecode(m.Groups["label"].Value).Trim();
                if (string.IsNullOrWhiteSpace(url) || !url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                    continue;

                results.Add(new QuickLink
                {
                    Label = string.IsNullOrWhiteSpace(label) ? url : label,
                    Url = url,
                    Category = folderStack.Count > 0 ? folderStack.Peek() : ""
                });
            }
        }

        return results;
    }
}
