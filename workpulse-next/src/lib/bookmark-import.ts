import type { QuickLink } from "@/lib/api/types";

/**
 * Parses the Netscape Bookmark File Format (what every browser, including
 * Chrome, produces from "Export bookmarks"). Folder names become each
 * bookmark's Category. Mirrors WorkPulse.Shared/Utilities/BookmarkImportParser.cs.
 */
export function parseNetscapeBookmarks(html: string): Partial<QuickLink>[] {
  const results: Partial<QuickLink>[] = [];
  const folderStack: string[] = [];
  let pendingFolder: string | null = null;

  const tokenRegex = /<H3[^>]*>([^]*?)<\/H3>|<A\s+[^>]*HREF="([^"]*)"[^>]*>([^]*?)<\/A>|(<DL>)|(<\/DL>)/gi;

  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const [, folder, url, label, dlOpen, dlClose] = match;
    if (folder !== undefined) {
      pendingFolder = decode(folder).trim();
    } else if (dlOpen) {
      if (pendingFolder !== null) {
        folderStack.push(pendingFolder);
        pendingFolder = null;
      }
    } else if (dlClose) {
      folderStack.pop();
    } else if (url !== undefined) {
      const decodedUrl = decode(url).trim();
      const decodedLabel = decode(label ?? "").trim();
      if (!decodedUrl || !/^https?:\/\//i.test(decodedUrl)) continue;
      results.push({
        label: decodedLabel || decodedUrl,
        url: decodedUrl,
        category: folderStack.length > 0 ? folderStack[folderStack.length - 1] : "",
      });
    }
  }

  return results;
}

/** Generates a Netscape Bookmark File that Chrome/Firefox/Safari can all re-import, grouping by category as folders. */
export function exportNetscapeBookmarks(links: QuickLink[]): string {
  const byCategory = new Map<string, QuickLink[]>();
  for (const link of links) {
    const key = link.category || "Bookmarks";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(link);
  }

  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const folders = Array.from(byCategory.entries())
    .map(
      ([category, items]) => `    <DT><H3>${escape(category)}</H3>
    <DL><p>
${items.map((l) => `        <DT><A HREF="${escape(l.url)}">${escape(l.label)}</A>`).join("\n")}
    </DL><p>`
    )
    .join("\n");

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${folders}
</DL><p>
`;
}
