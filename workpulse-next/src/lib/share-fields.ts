import type { ShareableResourceType } from "@/lib/api/types";

export interface ShareField {
  key: string;
  label: string;
  multiline?: boolean;
}

/** One small config per shareable type rather than seven bespoke forms — every type reduces to
 * "a few text fields," so both the authenticated Shared-with-Me viewer and the public /s/[token]
 * page render off this same list instead of duplicating field/label wiring twice over. */
export const SHARE_FIELDS: Record<ShareableResourceType, ShareField[]> = {
  TripReport: [
    { key: "destination", label: "Destination" },
    { key: "purpose", label: "Purpose" },
    { key: "notes", label: "Notes", multiline: true },
  ],
  // No editable-fields path: the existing update-document endpoint only covers amount/currency/
  // status/resource-link, not label/category — those are set once at upload time.
  TripDocument: [],
  DailyReport: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body", multiline: true },
  ],
  WeeklyReport: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body", multiline: true },
  ],
  Contact: [
    { key: "familyName", label: "Family Name" },
    { key: "givenName", label: "Given Name" },
    { key: "department", label: "Department" },
    { key: "email", label: "Email" },
    { key: "contactNumber", label: "Contact Number" },
    { key: "notes", label: "Notes", multiline: true },
  ],
  QuickLink: [
    { key: "label", label: "Label" },
    { key: "url", label: "URL" },
    { key: "category", label: "Category" },
  ],
  Resource: [
    { key: "title", label: "Title" },
    { key: "notes", label: "Notes", multiline: true },
  ],
};
