export interface ChangelogEntry {
  version: string;
  date: string;
  highlights: string[];
}

// Hand-maintained, newest first — bump alongside package.json's version on every commit that
// ships something worth telling a user about (skip pure refactors/internal fixes).
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.5.0",
    date: "2026-08-30",
    highlights: [
      "Business Trips: added a status (Planned/In Progress/Completed), expense tracking (amount + currency per document, with a running total), and a per-trip Export (XLSX or HTML summary)",
      "Reimbursement: added a status per document (Pending/Submitted/Reimbursed)",
      "Both Trips and Reimbursement can now link a document to a saved Resource, and back",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-08-30",
    highlights: [
      "Moved About (version info + this changelog) out of Settings and into its own sidebar item, for a quicker check on what's new",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-08-30",
    highlights: [
      "Resources: \"New Resource\" now accepts any number of files at once (drag-and-drop or multi-select), each becoming its own resource",
      "A bigger upload window with a per-file progress list — queued, uploading, done, or failed, macOS-style",
      "Executable/script file types are blocked from upload; everything else (documents, images, archives, media) is unrestricted",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-08-30",
    highlights: [
      "Added export for Daily and Weekly Reports — select one or more entries and download as a styled XLSX or HTML file (HTML keeps full rich-text formatting)",
      "Resources: a Note's full content now shows properly in its detail view instead of being cut off to one line",
      "Spotlight (Cmd/Ctrl+K): added \"Open Claude\" as a web shortcut, opening claude.ai in a new tab",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-08-30",
    highlights: [
      "Added Attendance export — pick any one or several months and download as a styled XLSX or HTML file",
      "Fixed the Attendance dashboard defaulting to the wrong settlement period after payday — it now shows whichever period today's date actually falls in, not just the most recently saved month",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-08-30",
    highlights: [
      "Redesigned every sidebar icon as an original Liquid Glass glyph — flat badges, true squircle corners, and hand-drawn artwork for all 12 nav items plus Settings' section icons",
      "Redesigned Settings into an Apple-style drill-down layout — grouped rows with grid-line dividers, each opening its own sub-page",
      "Added a Light/Dark/System theme selector and a 6-color accent picker that now drives selected rows, buttons, and links app-wide, synced to your account across devices",
      "Added Reset to Defaults for Appearance",
      "Fixed Spotlight's Add Bookmark action not opening the add-bookmark modal when already on the Bookmarks page",
      "Fixed Home's cards overflowing into the row below them, and removed the continuous glass-sheen/floating-icon animations that were causing scroll lag",
      "Fixed the sidebar's selected-row highlight not always rendering",
      "Fixed opening Settings visibly resizing the whole app's font if the saved preference differed from what was already showing",
      "Smoother scrolling site-wide (momentum + scroll-chaining containment)",
    ],
  },
  {
    version: "0.4.2",
    date: "2026-08-29",
    highlights: [
      "Fixed the notification bell dropdown rendering behind page content instead of above it",
      "Fixed Settings' multi-option rows (Font Size, Date Format, Week Starts On, ...) overflowing the page on narrower screens",
    ],
  },
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
