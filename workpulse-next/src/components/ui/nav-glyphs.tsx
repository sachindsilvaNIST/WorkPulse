import type { SVGProps } from "react";

/** Original, hand-drawn glyph set for the WorkPulse sidebar — simple geometric primitives
 * (rects, circles, basic arcs) composed from scratch for each nav concept, not sourced from or
 * modeled on any existing icon library's path data. Deliberately plain shapes: a grid, a clock
 * face, a page with rule lines, ... — generic pictograms in the same way a calendar page or a
 * gear are generic ideas, not anyone's proprietary artwork. Rendered inside the Liquid Glass
 * badge (see icon-badge.tsx), so these stay bold and simple rather than detailed line art. */

type GlyphProps = SVGProps<SVGSVGElement>;

/** Home's finished design (locked): a translucent glass container panel with four filled tiles —
 * a small grouped "palette" — instead of a single-color line glyph. Self-contained (fills its own
 * background/shape rather than relying on `currentColor`), so it renders identically regardless of
 * the badge's own fill — this is the one nav glyph that isn't a plain stroke icon. */
export function HomeGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.6" />
      <rect x="2.8" y="2.8" width="8.7" height="8.7" rx="2.2" fill="#FFFFFF" />
      <rect x="12.5" y="2.8" width="8.7" height="8.7" rx="2.2" fill="#FFE9B8" />
      <rect x="2.8" y="12.5" width="8.7" height="8.7" rx="2.2" fill="#FFD9A0" />
      <rect x="12.5" y="12.5" width="8.7" height="8.7" rx="2.2" fill="#FFF6E0" />
    </svg>
  );
}

/** Attendance's finished design (locked): a translucent glass watch face — glass fill, edge
 * stroke, and a small highlight arc on the dial — with four tick marks and two hands set to the
 * classic 10:10 display pose (a generic, symmetric watch-icon convention, not any specific
 * artwork). Self-contained fills, same pattern as HomeGlyph. */
export function ClockGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <path d="M6.3 6.8a9.3 9.3 0 0 1 9.3-3.6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.1" strokeLinecap="round" />
      <rect x="11.2" y="1.8" width="1.6" height="3" rx="0.8" fill="#B48CFF" />
      <rect x="19.2" y="11.2" width="3" height="1.6" rx="0.8" fill="#B48CFF" />
      <rect x="11.2" y="19.2" width="1.6" height="3" rx="0.8" fill="#B48CFF" />
      <rect x="1.8" y="11.2" width="3" height="1.6" rx="0.8" fill="#B48CFF" />
      <rect x="11.25" y="3.3" width="1.5" height="8.7" rx="0.75" fill="#5A2FD6" transform="rotate(60 12 12)" />
      <rect x="11.25" y="6" width="1.5" height="6" rx="0.75" fill="#3D1F99" transform="rotate(-60 12 12)" />
      <circle cx="12" cy="12" r="1.35" fill="#3D1F99" />
    </svg>
  );
}

/** Daily/Weekly Reports' finished design (locked): a translucent glass document panel — same
 * fill+edge-stroke treatment as Home's panel, deliberately with no highlight arc (an arc only
 * reads correctly on a round shape like Attendance's dial; on a rectangle it just floats as a
 * stray mark) — with a bold title bar and three paragraph-line bars of decreasing width/opacity. */
export function PageGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <rect x="4.8" y="6.3" width="10.2" height="2.4" rx="1.2" fill="#FFFFFF" />
      <rect x="4.8" y="11" width="14.4" height="1.8" rx="0.9" fill="rgba(255,255,255,0.85)" />
      <rect x="4.8" y="14.3" width="14.4" height="1.8" rx="0.9" fill="rgba(255,255,255,0.85)" />
      <rect x="4.8" y="17.6" width="9" height="1.8" rx="0.9" fill="rgba(255,255,255,0.65)" />
    </svg>
  );
}

/** Business Trips' finished design (locked): a glass briefcase body panel with a handle loop, a
 * top sheen band, a horizontal seam, and a clasp — mapped directly to a briefcase shape (the same
 * "map to a distinct shape" approach ClockGlyph uses for Attendance) rather than a generic panel. */
export function BriefcaseGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M8.6 6.4V5.1a2.3 2.3 0 0 1 2.3-2.3h2.2a2.3 2.3 0 0 1 2.3 2.3v1.3" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="1.8" y="6.2" width="20.4" height="15.4" rx="4" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <rect x="3" y="7.4" width="18" height="4.6" rx="2.6" fill="rgba(255,255,255,0.22)" />
      <rect x="1.8" y="12.6" width="20.4" height="2.6" fill="rgba(255,255,255,0.85)" />
      <rect x="10.2" y="11.6" width="3.6" height="4.6" rx="1" fill="#3D2B7A" />
    </svg>
  );
}

/** Reimbursement's finished design (locked): a glass panel shaped like an actual receipt slip —
 * rounded top, torn/zigzag bottom edge — with itemized text-line bars and a coin accent, mapped
 * to a distinct shape rather than reusing PageGlyph's plain rectangle. */
export function TicketGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M3 4Q3 2 5 2L19 2Q21 2 21 4L21 18L19.5 21L18 18L16.5 21L15 18L13.5 21L12 18L10.5 21L9 18L7.5 21L6 18L4.5 21L3 18Z"
        fill="rgba(255,255,255,0.34)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <rect x="4.5" y="3.2" width="15" height="4.2" rx="2.1" fill="rgba(255,255,255,0.22)" />
      <rect x="5.4" y="8.6" width="9.6" height="2.2" rx="1.1" fill="#FFFFFF" />
      <rect x="5.4" y="12" width="13.2" height="1.7" rx="0.85" fill="rgba(255,255,255,0.85)" />
      <rect x="5.4" y="14.6" width="8.4" height="1.7" rx="0.85" fill="rgba(255,255,255,0.65)" />
      <circle cx="17.2" cy="14.6" r="2.7" fill="#1B7A4F" />
      <circle cx="17.2" cy="14.6" r="2.7" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
      <rect x="16.6" y="12.7" width="1.2" height="3.8" rx="0.6" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

/** Bookmarks' finished design (locked): a glass panel shaped like an actual bookmark tag —
 * rounded top, V-notch bottom — with a top sheen band, mapped to a distinct shape rather than a
 * plain rectangle. A diamond "jewel" accent was tried and dropped (read as an unexplained dark
 * blob against the red badge). */
export function RibbonGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M5 3Q5 2 6.5 2L17.5 2Q19 2 19 3L19 21L12 16.5L5 21Z" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" strokeLinejoin="round" />
      <rect x="6.2" y="3.2" width="11.6" height="4" rx="2" fill="rgba(255,255,255,0.22)" />
    </svg>
  );
}

/** Contacts' finished design (locked): a glass panel + top sheen band (Home/Reports treatment)
 * with a single filled person silhouette (head + shoulders) — matches the common "solo figure"
 * contact-card convention as a generic pictogram, not a reproduction of any specific app's icon. */
export function PeopleGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <rect x="3" y="3" width="18" height="4.2" rx="2.1" fill="rgba(255,255,255,0.22)" />
      <circle cx="12" cy="9.6" r="3.7" fill="#FFFFFF" />
      <path d="M5.8 20.2C5.8 15.7 8.4 12.9 12 12.9C15.6 12.9 18.2 15.7 18.2 20.2Z" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

/** Gmail Labels' finished design (locked): a glass envelope body panel with a filled triangular
 * flap, a top sheen band behind it, a translucent edge stroke on the flap, and a bright highlight
 * line tracing the fold crease — the classic envelope silhouette as solid layers, not a line icon. */
export function EnvelopeGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="4.5" width="21" height="15" rx="3.5" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <rect x="3" y="5.4" width="18" height="4" rx="2" fill="rgba(255,255,255,0.18)" />
      <path d="M2.4 5.7L12 14.2L21.6 5.7Z" fill="rgba(255,255,255,0.85)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M4.6 6.4L12 12.4L19.4 6.4" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Resources' finished design (locked, also used for JP Dictionary): a glass container panel +
 * top sheen band behind a small shelf of three filled book spines of varying height/color — the
 * same "grouped collection" language as Home's four tiles, narrower and taller to read as books. */
export function BooksGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" fill="rgba(255,255,255,0.34)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.6" />
      <rect x="3" y="2.7" width="18" height="4" rx="2" fill="rgba(255,255,255,0.22)" />
      <rect x="4" y="8" width="4" height="12" rx="1.3" fill="#FFFFFF" />
      <rect x="9.3" y="6" width="4.4" height="14" rx="1.3" fill="#D6ECFF" />
      <rect x="15" y="9.5" width="4" height="10.5" rx="1.3" fill="#AEDBFF" />
    </svg>
  );
}

/** Settings' finished design (locked): two concentric computed gear silhouettes sharing one
 * center — a hollow outer ring with tapered teeth (wide base, narrow tip — that taper is what
 * reads as "sharp" rather than blocky) and a smaller solid gear nested inside with a gap between
 * them. Path data is precomputed (same math as the design-review artifact) rather than run at
 * render time. Outer ring gets a diagonal glass gradient fill (bright top-left, fading toward
 * transparent bottom-right) baked into the shape itself. */
export function GearGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <defs>
        <linearGradient id="settings-gear-glass" x1="20%" y1="15%" x2="80%" y2="85%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>
      <path
        d="M11.20 3.04 L11.60 0.41 L12.40 0.41 L12.80 3.04 L13.76 3.17 L14.88 0.76 L15.65 0.99 L15.29 3.62 L16.18 4.03 L17.93 2.03 L18.60 2.46 L17.52 4.89 L18.25 5.53 L20.50 4.11 L21.02 4.71 L19.30 6.73 L19.82 7.55 L22.38 6.82 L22.71 7.55 L20.49 9.00 L20.76 9.94 L23.42 9.96 L23.53 10.74 L20.99 11.51 L20.99 12.49 L23.53 13.26 L23.42 14.04 L20.76 14.06 L20.49 15.00 L22.71 16.45 L22.38 17.18 L19.82 16.45 L19.30 17.27 L21.02 19.29 L20.50 19.89 L18.25 18.47 L17.52 19.11 L18.60 21.54 L17.93 21.97 L16.18 19.97 L15.29 20.38 L15.65 23.01 L14.88 23.24 L13.76 20.83 L12.80 20.96 L12.40 23.59 L11.60 23.59 L11.20 20.96 L10.24 20.83 L9.12 23.24 L8.35 23.01 L8.71 20.38 L7.82 19.97 L6.07 21.97 L5.40 21.54 L6.48 19.11 L5.75 18.47 L3.50 19.89 L2.98 19.29 L4.70 17.27 L4.18 16.45 L1.62 17.18 L1.29 16.45 L3.51 15.00 L3.24 14.06 L0.58 14.04 L0.47 13.26 L3.01 12.49 L3.01 11.51 L0.47 10.74 L0.58 9.96 L3.24 9.94 L3.51 9.00 L1.29 7.55 L1.62 6.82 L4.18 7.55 L4.70 6.73 L2.98 4.71 L3.50 4.11 L5.75 5.53 L6.48 4.89 L5.40 2.46 L6.07 2.03 L7.82 4.03 L8.71 3.62 L8.35 0.99 L9.12 0.76 L10.24 3.17 Z M21.00 12A9 9 0 1 0 3.00 12A9 9 0 1 0 21.00 12Z"
        fill="url(#settings-gear-glass)"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="0.6"
        fillRule="evenodd"
      />
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.35" />
      <path
        d="M11.51 6.62 L11.82 5.60 L12.18 5.60 L12.49 6.62 L12.91 6.68 L13.48 5.77 L13.83 5.87 L13.87 6.93 L14.26 7.10 L15.04 6.37 L15.36 6.55 L15.12 7.59 L15.45 7.85 L16.39 7.35 L16.65 7.61 L16.15 8.55 L16.41 8.88 L17.45 8.64 L17.63 8.96 L16.90 9.74 L17.07 10.13 L18.13 10.17 L18.23 10.52 L17.32 11.09 L17.38 11.51 L18.40 11.82 L18.40 12.18 L17.38 12.49 L17.32 12.91 L18.23 13.48 L18.13 13.83 L17.07 13.87 L16.90 14.26 L17.63 15.04 L17.45 15.36 L16.41 15.12 L16.15 15.45 L16.65 16.39 L16.39 16.65 L15.45 16.15 L15.12 16.41 L15.36 17.45 L15.04 17.63 L14.26 16.90 L13.87 17.07 L13.83 18.13 L13.48 18.23 L12.91 17.32 L12.49 17.38 L12.18 18.40 L11.82 18.40 L11.51 17.38 L11.09 17.32 L10.52 18.23 L10.17 18.13 L10.13 17.07 L9.74 16.90 L8.96 17.63 L8.64 17.45 L8.88 16.41 L8.55 16.15 L7.61 16.65 L7.35 16.39 L7.85 15.45 L7.59 15.12 L6.55 15.36 L6.37 15.04 L7.10 14.26 L6.93 13.87 L5.87 13.83 L5.77 13.48 L6.68 12.91 L6.62 12.49 L5.60 12.18 L5.60 11.82 L6.62 11.51 L6.68 11.09 L5.77 10.52 L5.87 10.17 L6.93 10.13 L7.10 9.74 L6.37 8.96 L6.55 8.64 L7.59 8.88 L7.85 8.55 L7.35 7.61 L7.61 7.35 L8.55 7.85 L8.88 7.59 L8.64 6.55 L8.96 6.37 L9.74 7.10 L10.13 6.93 L10.17 5.87 L10.52 5.77 L11.09 6.68 Z M14.20 12A2.2 2.2 0 1 0 9.80 12A2.2 2.2 0 1 0 14.20 12Z"
        fill="rgba(150,150,156,0.88)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.3"
        fillRule="evenodd"
      />
    </svg>
  );
}

/** Admin's finished design (locked): a glass shield panel (already a distinct silhouette) with a
 * top sheen band and a bold filled checkmark accent — the same "distinct shape + accent" pattern
 * as the receipt/coin and briefcase/clasp. */
export function ShieldGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M12 2.4L19.8 5.5V12C19.8 17 16.5 21.1 12 22.2C7.5 21.1 4.2 17 4.2 12V5.5Z"
        fill="rgba(255,255,255,0.34)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path d="M7.3 6.6C9 5.7 10.6 5.2 12 5.2C13.4 5.2 15 5.7 16.7 6.6L16.7 9.4C15 8.5 13.4 8 12 8C10.6 8 9 8.5 7.3 9.4Z" fill="rgba(255,255,255,0.22)" />
      <path d="M8.1 12.6L11 15.5L16.3 10.1" fill="none" stroke="#7A0D14" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo mark's finished design (locked): a round glass disc backing (fill + edge stroke only —
 * a highlight arc was tried and dropped, it read as a disconnected stray line above the circle)
 * with a bold filled pulse/EKG waveform and a bright accent dot at its peak. */
export function PulseGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
      <path d="M3 13H7L9 7L12 17L14 9L16 13H21" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="1.5" fill="#30D158" stroke="#FFFFFF" strokeWidth="0.6" />
    </svg>
  );
}
