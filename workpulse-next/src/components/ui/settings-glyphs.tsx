import type { SVGProps } from "react";

/** Glyph set for the Settings page's section icons — same design system as nav-glyphs.tsx (flat
 * badge, self-contained multi-layer glyph, glass inner panel), reviewed as one batch rather than
 * one-by-one since the system was already proven across the sidebar's 12 icons. Security, Gmail,
 * and Account reuse ShieldGlyph/EnvelopeGlyph/PeopleGlyph from nav-glyphs.tsx directly instead of
 * duplicating them here — same concepts, no need for a second copy. */

type GlyphProps = SVGProps<SVGSVGElement>;

/** Appearance: a glass panel behind four filled color-swatch dots of decreasing opacity — the
 * same "grouped collection" language as Home's tiles, circular instead of square to read as paint
 * dots rather than app tiles. */
export function PaletteGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <circle cx="7.6" cy="7.6" r="2.7" fill="#FFFFFF" />
      <circle cx="16.4" cy="7.6" r="2.7" fill="rgba(255,255,255,0.78)" />
      <circle cx="7.6" cy="16.4" r="2.7" fill="rgba(255,255,255,0.55)" />
      <circle cx="16.4" cy="16.4" r="2.7" fill="rgba(255,255,255,0.34)" />
    </svg>
  );
}

/** Work Hours: the same glass watch-face structure as the sidebar's Attendance dial, but with
 * neutral white/translucent ticks and hands instead of Attendance's purple — this glyph needs to
 * sit correctly on whatever badge color a settings section uses, not one fixed hue. */
export function WorkHoursGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <rect x="11.2" y="1.8" width="1.6" height="3" rx="0.8" fill="rgba(255,255,255,0.6)" />
      <rect x="19.2" y="11.2" width="3" height="1.6" rx="0.8" fill="rgba(255,255,255,0.6)" />
      <rect x="11.2" y="19.2" width="1.6" height="3" rx="0.8" fill="rgba(255,255,255,0.6)" />
      <rect x="1.8" y="11.2" width="3" height="1.6" rx="0.8" fill="rgba(255,255,255,0.6)" />
      <rect x="11.25" y="3.3" width="1.5" height="8.7" rx="0.75" fill="#FFFFFF" transform="rotate(60 12 12)" />
      <rect x="11.25" y="6" width="1.5" height="6" rx="0.75" fill="rgba(255,255,255,0.85)" transform="rotate(-60 12 12)" />
      <circle cx="12" cy="12" r="1.35" fill="#FFFFFF" />
    </svg>
  );
}

/** Preferences: a glass panel with three horizontal tracks, each with a filled knob at a
 * different position — reads immediately as "adjustable settings" without text. */
export function SlidersGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <rect x="4" y="6.2" width="16" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="9" cy="7.2" r="2.3" fill="#FFFFFF" />
      <rect x="4" y="11" width="16" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="15.5" cy="12" r="2.3" fill="#FFFFFF" />
      <rect x="4" y="15.8" width="16" height="2" rx="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="11.5" cy="16.8" r="2.3" fill="#FFFFFF" />
    </svg>
  );
}

/** Keyboard Shortcuts: a glass body panel with a grid of filled key rects and a wide spacebar —
 * mapped to a distinct shape rather than reusing a generic panel. */
export function KeyboardGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="5" width="21" height="14" rx="3.2" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <rect x="3.6" y="7.3" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.85)" />
      <rect x="7" y="7.3" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.85)" />
      <rect x="10.4" y="7.3" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.85)" />
      <rect x="13.8" y="7.3" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.85)" />
      <rect x="17.2" y="7.3" width="3.2" height="2.6" rx="0.8" fill="rgba(255,255,255,0.85)" />
      <rect x="3.6" y="10.7" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.65)" />
      <rect x="7" y="10.7" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.65)" />
      <rect x="10.4" y="10.7" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.65)" />
      <rect x="13.8" y="10.7" width="2.6" height="2.6" rx="0.8" fill="rgba(255,255,255,0.65)" />
      <rect x="17.2" y="10.7" width="3.2" height="2.6" rx="0.8" fill="rgba(255,255,255,0.65)" />
      <rect x="5.5" y="14.1" width="13" height="2.6" rx="1.3" fill="#FFFFFF" />
    </svg>
  );
}

/** Google Drive: a glass panel behind a filled cloud silhouette with an upward sync arrow — a
 * generic "cloud backup" pictogram, not the Drive triangle logo (that's someone else's trademark,
 * same reasoning as the SF Symbols constraint elsewhere in this design system). */
export function CloudSyncGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <path
        d="M6.5 15.5C4.6 15.5 3 13.9 3 12C3 10.3 4.2 8.9 5.8 8.6C6.3 6.4 8.3 4.8 10.6 4.8C13 4.8 15 6.5 15.4 8.8C17.5 9 19 10.7 19 12.8C19 15 17.2 16.8 15 16.8H6.8Z"
        fill="#FFFFFF"
      />
      <path d="M11 18.5V11.5M11 11.5L8.6 14M11 11.5L13.4 14" fill="none" stroke="#1E5FBF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Your Data: a glass document panel (Reports' treatment) with a bold downward arrow into a
 * filled tray — "export a backup" read directly as an icon. */
export function DownloadTrayGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <path d="M12 4.5V13.5M12 13.5L8.5 10M12 13.5L15.5 10" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="16.5" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

/** Danger Zone: a glass warning-triangle panel (a distinct shape, not a rectangle) with a bold
 * filled exclamation mark — the universal "irreversible action" pictogram. */
export function WarningGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M12 2.2L22.3 20.5C22.7 21.3 22.1 22.2 21.2 22.2H2.8C1.9 22.2 1.3 21.3 1.7 20.5Z"
        fill="rgba(255,255,255,0.3)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <rect x="10.9" y="8.5" width="2.2" height="7" rx="1.1" fill="#FFFFFF" />
      <circle cx="12" cy="18" r="1.4" fill="#FFFFFF" />
    </svg>
  );
}

/** About: the logo mark's round glass disc treatment, with a bold filled "i" instead of a pulse
 * waveform — same backing material, different accent for a different concept. */
export function InfoGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <circle cx="12" cy="7.3" r="1.6" fill="#FFFFFF" />
      <rect x="10.6" y="10.5" width="2.8" height="8" rx="1.4" fill="#FFFFFF" />
    </svg>
  );
}

/** What's New: a glass panel (Home's treatment) behind a large four-point sparkle and a smaller
 * companion sparkle — "something new/exciting" read directly as an icon. */
export function SparkleGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
      <path d="M12.5 4C13.3 8 13.6 8.3 17.6 9C13.6 9.7 13.3 10 12.5 14C11.7 10 11.4 9.7 7.4 9C11.4 8.3 11.7 8 12.5 4Z" fill="#FFFFFF" />
      <path d="M6.5 13.5C6.9 15.6 7.1 15.8 9.2 16.2C7.1 16.6 6.9 16.8 6.5 18.9C6.1 16.8 5.9 16.6 3.8 16.2C5.9 15.8 6.1 15.6 6.5 13.5Z" fill="rgba(255,255,255,0.8)" />
    </svg>
  );
}
