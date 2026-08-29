export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

// Hand-maintained, newest first — bump alongside package.json's version on every commit that
// ships something worth telling a user about (skip pure refactors/internal fixes).
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.1",
    date: "2026-08-29",
    highlights: [
      "Fixed the notification bell dropdown overflowing off-screen in the sidebar",
      "Fixed Settings rows (Font Size, Date Format, ...) drifting out of alignment when their description text wraps",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-08-28",
    highlights: [
      "Redesigned Home into a Liquid Glass, Apple-widget-style dashboard — live Weather and Clock widgets, non-uniform bento tiles for every section",
      "Real notification triggers: a daily-report reminder and upcoming-trip alerts now actually fire, in-app (bell icon) and by email",
      "Spotlight (Cmd/Ctrl+K) can jump straight into adding a Bookmark, Resource, or Contact, not just navigate",
      "New Recently Viewed widget on Home, tracking the last few Bookmarks/Resources/Contacts you opened",
      "Softer accent gradients on Bookmarks, Contacts, Reimbursement, and Resources cards",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-28",
    highlights: [
      "Registration now only asks for email verification once, at sign-up — logging back in never re-prompts for a code",
      "Real email delivery for verification and 2FA codes, via Resend",
      "Every search bar in the app got a clear ('x') button",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-08-23",
    highlights: [
      "Added Resource Library — save links, files, and notes in one place, searchable by keyword",
      "Apple-style loading spinner and drag-and-drop uploads everywhere; upload cap raised to 50MB",
      "Redesigned Settings as a sidebar-categorized page, with profile and danger-zone controls",
      "Added Gmail Label Manager (browse, search, create/rename/delete labels)",
      "Added Two-Factor Authentication, active session management, and Google Drive backup for Reimbursement",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-11",
    highlights: [
      "Launched the Next.js web platform — Attendance, Reports, Trips, Reimbursement, Bookmarks, Contacts, and Dictionary",
      "Apple-style visual redesign across the whole app",
    ],
  },
];
