import {
  attendanceApi,
  contactsApi,
  dailyReportsApi,
  downloadBlob,
  quickLinksApi,
  tripReportsApi,
  weeklyReportsApi,
} from "@/lib/api/client";

/** Bundles the current user's own data (not admin-scoped, not other users') into one downloadable
 * JSON file — a personal backup, independent of anything an admin controls. Trip documents
 * (attachments) are listed by metadata only, not embedded, since they're binary files better
 * fetched individually via the existing download endpoint. */
export async function exportUserData() {
  const [months, dailyReports, weeklyReports, tripReports, contacts, bookmarks] = await Promise.all([
    attendanceApi.getMonths(),
    dailyReportsApi.getAll(),
    weeklyReportsApi.getAll(),
    tripReportsApi.getAll(),
    contactsApi.getAll(),
    quickLinksApi.getAll(),
  ]);

  const attendance = await Promise.all(months.map((m) => attendanceApi.getMonth(m.year, m.month)));

  const bundle = {
    exportedAtUtc: new Date().toISOString(),
    attendance,
    dailyReports,
    weeklyReports,
    tripReports,
    contacts: contacts.contacts,
    bookmarks,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  downloadBlob(blob, `workpulse-export-${new Date().toISOString().slice(0, 10)}.json`);
}
