import { exportApi, downloadBlob } from "@/lib/api/client";

/** Downloads a full backup of everything the current user owns — every structured record
 * (attendance, reports, trips, reimbursement, bookmarks, resources, contacts, settings) plus the
 * actual binary files (trip documents, resource files), bundled server-side into one ZIP. This is
 * the app's only full backup — every other export is one section at a time — which matters given
 * both the API and its database run on Render's free tier. */
export async function exportUserData() {
  const { blob, fileName } = await exportApi.all();
  downloadBlob(blob, fileName);
}
