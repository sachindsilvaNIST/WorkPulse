export const DATE_FORMAT_OPTIONS = ["MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"] as const;
export type DateFormatPattern = (typeof DATE_FORMAT_OPTIONS)[number];

/** Formats an ISO "yyyy-MM-dd" date string per one of the three supported patterns. Parses the
 * ISO string manually (not `new Date(iso)`) to avoid timezone shifting the date by a day. */
export function formatDate(iso: string, pattern: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, yyyy, MM, dd] = match;
  switch (pattern) {
    case "dd/MM/yyyy":
      return `${dd}/${MM}/${yyyy}`;
    case "yyyy-MM-dd":
      return `${yyyy}-${MM}-${dd}`;
    case "MM/dd/yyyy":
    default:
      return `${MM}/${dd}/${yyyy}`;
  }
}
