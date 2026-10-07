# WorkPulse — Liquid Glass UI Redesign (Claude Code brief)

> **How to use this file:** put it at `workpulse-next/docs/LIQUID_GLASS_REDESIGN.md`, open Claude Code in the repo root, and say:
> *"Read `workpulse-next/docs/LIQUID_GLASS_REDESIGN.md` and implement it phase by phase. Start with Phase 0 and show me the audit + plan before changing code."*

---

## 0. Mission & ground rules

Re-skin the **`workpulse-next/`** web app (Next.js · React · TypeScript · Tailwind v4 · shadcn-style components) into an Apple-26-style **Liquid Glass** design: floating translucent panels over a soft colourful wallpaper, pill-shaped controls, large radii, system font, one accent colour.

Hard rules:

1. **Visual only.** Do not change API calls, data models, routes, auth, state management or business logic. If a visual change seems to need a logic change, stop and ask.
2. **Scope:** only `workpulse-next/`. Do not touch `WorkPulse/` (Avalonia), `WorkPulse.Web/` (Blazor), `WorkPulse.Api/` or `WorkPulse.Shared/`.
3. **Reuse, don't duplicate.** Restyle the existing `components/ui/*` primitives in place (Button, Card, Input, Tabs, Dialog, etc.) so every page benefits. Add new primitives only where none exists.
4. **Tokens first.** Every colour, radius, blur and shadow comes from the CSS variables in §2. No hard-coded hex values inside components (the tokens file is the only place hex values live).
5. **Wire to existing settings.** The app already has theme (light/dark/system), accent colour, font size and a "Liquid Glass intensity" slider. Find where they are stored and applied, and drive the new tokens from them (§2.4). Do not create parallel settings.
6. **Work in phases** (§8). After each phase: `npm run lint`, `npx tsc --noEmit`, `npm run build` must pass; commit with a clear message.
7. Never nest a `backdrop-filter` panel inside another `backdrop-filter` panel. Inner surfaces use the flat *fill* tokens instead (perf + visual clarity).

---

## 1. Phase 0 — Audit (do this first, report back, no edits)

Find and list:

- Global stylesheet(s) (`app/globals.css` or similar) and how Tailwind v4 `@theme` / dark mode (`next-themes` class? `data-theme`?) is configured.
- The root layout and the app shell: sidebar, top bar, page wrapper.
- Every file in `components/ui/` and which pages use them.
- The theme provider and where **theme**, **accent colour**, **font size** and **Liquid Glass intensity** are stored (localStorage? user settings API?) and applied (CSS vars? classes?). Note the intensity value's range (0–100? 0–1?).
- All routes/pages under `app/` (attendance, trips, reimbursement, reports, contacts, bookmarks, dictionary, resources, mail/gmail, shared, admin, settings, auth/login/2FA, etc.).
- Charts/table libraries in use.

Then propose a short plan mapping §8's phases onto real file paths.

---

## 2. Design tokens

### 2.1 Typography

```
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", system-ui, sans-serif;
```

No web font download. Use `font-variant-numeric: tabular-nums` for every time, duration, date and count.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Page title (h1) | 30px (1.875rem) | 700 | -0.025em |
| Hero heading | 22px | 700 | -0.02em |
| Big stat number | 30px | 700 | -0.03em |
| Card title (h2) | 17px | 650 | -0.01em |
| Body / nav / table | 14px | 400–500 (active 600) | 0 |
| Label (card eyebrow) | 13px | 600, secondary colour | 0 |
| Caption / meta | 12px | 400, secondary colour | 0 |
| Section label (sidebar) | 11px | 600, uppercase, tertiary colour | 0.04em |

Use `rem` so the existing **font-size setting** scales everything (root font size = setting; default 16px → the px values above).

### 2.2 Radii, spacing, motion

```
--radius-panel: 28px;   /* sidebar, big cards */
--radius-tile: 24px;    /* stat tiles */
--radius-inner: 20px;   /* nested cards / previews */
--radius-thumb: 14px;   /* theme preview tiles */
--radius-item: 12px;    /* nav items, menu items */
--radius-icon: 10px;    /* app icon, small icon tiles */
--radius-pill: 999px;   /* buttons, inputs, chips, segmented controls */

--shell-gap: 16px;      /* outer padding + gap between all panels */
--panel-pad: 20px;      /* card padding (hero card 22px, stat tile 18px, sidebar 14px) */

--ease-glass: cubic-bezier(0.32, 0.72, 0, 1);
--dur-fast: 160ms; --dur-base: 240ms;
```

Interactive: hover = slightly brighter fill; press = `transform: scale(0.97)`; transitions on `background-color, box-shadow, transform, opacity` using `--dur-fast var(--ease-glass)`. Respect `prefers-reduced-motion` (no scale, no transitions).

Minimum hit target **44×44px** for every button/icon button.

### 2.3 Colour tokens (exact values from the approved design)

Put this in the global stylesheet. Adapt the dark selector to whatever the audit found (`.dark` class shown here).

```css
:root {
  --glass-intensity: 0.6;                 /* 0 = tinted/solid, 1 = clear. Driven by the setting. */

  /* Wallpaper */
  --wallpaper-base: #E8ECF3;
  --wallpaper:
    radial-gradient(ellipse 55% 45% at 10% 6%,  rgba(118,168,255,0.60), transparent 70%),
    radial-gradient(ellipse 45% 40% at 92% 14%, rgba(255,182,138,0.55), transparent 70%),
    radial-gradient(ellipse 55% 50% at 68% 98%, rgba(176,146,255,0.45), transparent 70%);

  /* Glass */
  --glass-alpha: calc(0.85 - var(--glass-intensity) * 0.45);   /* 0.6 → 0.58 */
  --glass-bg: rgb(255 255 255 / var(--glass-alpha));
  --glass-blur: calc(12px + var(--glass-intensity) * 30px);    /* 0.6 → 30px */
  --glass-border: rgba(255,255,255,0.78);
  --glass-highlight: inset 0 1px 0 rgba(255,255,255,0.95);
  --glass-shadow: 0 12px 36px rgba(30,41,59,0.09);
  --glass-shadow-sm: 0 6px 20px rgba(30,41,59,0.08);
  --glass-saturate: 180%;

  /* Text */
  --text-primary: #1D1D1F;
  --text-body: #3A3A3F;
  --text-secondary: #5F5F66;
  --text-tertiary: #6E6E73;

  /* Fills & lines (use inside glass instead of nesting glass) */
  --fill-1: rgba(118,118,128,0.12);       /* search field, quiet buttons */
  --fill-2: rgba(118,118,128,0.16);       /* progress tracks, badges */
  --fill-raised: rgba(255,255,255,0.90);  /* active nav item, selected segment */
  --fill-raised-shadow: 0 1px 3px rgba(30,41,59,0.10), inset 0 1px 0 #fff;
  --fill-glass-button: rgba(255,255,255,0.70);
  --separator: rgba(60,60,67,0.10);

  /* Accent (overwritten by the accent setting, see 2.4) */
  --accent: #0066E0;
  --accent-foreground: #FFFFFF;
  --accent-glow: 0 8px 20px color-mix(in srgb, var(--accent) 28%, transparent);
  --link: color-mix(in srgb, var(--accent) 88%, black);

  /* Status chips */
  --status-success-bg: rgba(52,199,89,0.16);  --status-success-fg: #1A5F2E;
  --status-warning-bg: rgba(255,149,0,0.18);  --status-warning-fg: #7A4200;
  --status-neutral-bg: rgba(118,118,128,0.14);--status-neutral-fg: #48484D;
  --status-info-bg: color-mix(in srgb, var(--accent) 12%, transparent);
  --status-info-fg: color-mix(in srgb, var(--accent) 70%, black);
  --status-danger-bg: rgba(255,59,48,0.14);   --status-danger-fg: #A1221A;

  --focus-ring: 0 0 0 2px var(--wallpaper-base), 0 0 0 4px var(--accent);
}

.dark {
  --wallpaper-base: #0D0F15;
  --wallpaper:
    radial-gradient(ellipse 55% 45% at 12% 8%,   rgba(40,96,230,0.55),  transparent 70%),
    radial-gradient(ellipse 45% 40% at 90% 20%,  rgba(160,70,210,0.42), transparent 70%),
    radial-gradient(ellipse 55% 50% at 60% 100%, rgba(255,120,70,0.25), transparent 70%);

  --glass-alpha: calc(0.86 - var(--glass-intensity) * 0.66);   /* 0.6 → 0.46 */
  --glass-bg: rgb(36 38 48 / var(--glass-alpha));
  --glass-border: rgba(255,255,255,0.12);
  --glass-highlight: inset 0 1px 0 rgba(255,255,255,0.14);
  --glass-shadow: 0 14px 44px rgba(0,0,0,0.38);
  --glass-shadow-sm: 0 8px 24px rgba(0,0,0,0.30);
  --glass-saturate: 170%;

  --text-primary: #F5F5F7;
  --text-body: #D1D1D6;
  --text-secondary: #A1A1A6;
  --text-tertiary: #8E8E93;

  --fill-1: rgba(118,118,128,0.24);
  --fill-2: rgba(255,255,255,0.12);
  --fill-raised: rgba(255,255,255,0.14);
  --fill-raised-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  --fill-glass-button: rgba(255,255,255,0.10);
  --separator: rgba(255,255,255,0.08);

  --accent: #0A84FF;
  --link: color-mix(in srgb, var(--accent) 60%, white);

  --status-success-bg: rgba(48,209,88,0.20);  --status-success-fg: #7EE2A0;
  --status-warning-bg: rgba(255,159,10,0.22); --status-warning-fg: #FFC66B;
  --status-neutral-bg: rgba(142,142,147,0.24);--status-neutral-fg: #D1D1D6;
  --status-info-bg: color-mix(in srgb, var(--accent) 24%, transparent);
  --status-info-fg: color-mix(in srgb, var(--accent) 55%, white);
  --status-danger-bg: rgba(255,69,58,0.22);   --status-danger-fg: #FF9A93;
}

/* Accessibility / fallbacks */
@media (prefers-reduced-transparency: reduce) {
  :root { --glass-alpha: 0.96; --glass-blur: 0px; }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root { --glass-alpha: 0.94; }
}

body {
  font-family: var(--font-sans);
  color: var(--text-primary);
  background-color: var(--wallpaper-base);
  background-image: var(--wallpaper);
  background-attachment: fixed;
  min-height: 100dvh;
}
```

Expose them to Tailwind v4 with `@theme inline` (e.g. `--color-glass: var(--glass-bg)`, `--color-accent: var(--accent)`, `--color-text-secondary: var(--text-secondary)`, `--radius-panel: …`) so classes like `bg-glass`, `text-text-secondary`, `rounded-panel` work. Map the existing shadcn variables (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring` …) onto these tokens so untouched shadcn code inherits the new look.

Add utilities:

```css
@utility glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-highlight), var(--glass-shadow);
}
@utility glass-sm {            /* toolbar capsules, floating pills */
  background: var(--glass-bg);
  backdrop-filter: blur(calc(var(--glass-blur) * 0.8)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(calc(var(--glass-blur) * 0.8)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-highlight), var(--glass-shadow-sm);
}
```

### 2.4 Wiring the existing settings

In the theme provider (wherever the audit found it), on load and on change, set on `document.documentElement`:

- `--glass-intensity` = intensity setting normalised to **0–1** (default **0.6**).
- `--accent` and `--accent-foreground` from the accent setting using this table:

| Accent | Light `--accent` | Dark `--accent` | `--accent-foreground` (light / dark) |
|---|---|---|---|
| Blue (default) | `#0066E0` | `#0A84FF` | `#FFF` / `#FFF` |
| Purple | `#7A3FD1` | `#BF5AF2` | `#FFF` / `#FFF` |
| Pink | `#C2185B` | `#FF375F` | `#FFF` / `#FFF` |
| Orange | `#B85C00` | `#FF9F0A` | `#FFF` / `#1D1D1F` |
| Green | `#1F7A3A` | `#30D158` | `#FFF` / `#1D1D1F` |
| Graphite | `#5A5A60` | `#8E8E93` | `#FFF` / `#1D1D1F` |

  If the app's existing accent list differs, keep its list and pick light/dark shades that keep ≥4.5:1 contrast against `--accent-foreground`.
- Root `font-size` from the font-size setting.
- Theme: keep the current light/dark/system mechanism.

Changes must apply live (no reload), exactly like the settings preview in §5.2.

---

## 3. Primitives (restyle existing `components/ui/*`; add the missing ones)

| Component | Spec |
|---|---|
| **GlassPanel** (new) | `<section>`/`<div>` with `glass`, `rounded-panel`, padding 20px. Props: `as`, `size: "panel" \| "tile" \| "inner"` (radius 28/24/20, padding 20/18/16), `className`. Every card on every page uses this. |
| **Card** (shadcn) | Re-implement on top of GlassPanel. CardTitle = card-title style; CardDescription = caption/secondary. |
| **Button** | `rounded-pill`, height 44px (sm 36px), padding 0 18–22px, 14–15px/600. Variants: `primary` = bg `--accent`, text `--accent-foreground`, shadow `inset 0 1px 0 rgba(255,255,255,0.35), var(--accent-glow)`; `glass` = bg `--fill-glass-button`, 1px `--glass-border`, inset highlight, text primary, weight 500; `ghost` = transparent, text body; `destructive` = danger fg on danger bg. Leading icon gap 6px. |
| **IconButton** (new) | 38–44px circle, transparent, icon 17px stroke 1.9, colour body; hover `--fill-1`. Required `aria-label`. |
| **ToolbarCapsule** (new) | `glass-sm`, `rounded-pill`, height 44px, padding 0 4px, flex row of IconButtons / text. Used for month stepper and action groups. |
| **SegmentedControl** (new; restyle Tabs list too) | Container `glass-sm` pill, height 44px, padding 4px. Segment: pill, padding 0 14px, 13px/500 body colour. Selected: bg `--fill-raised` (light: `#fff`), shadow `0 1px 4px rgba(30,41,59,0.14)`, 600 primary. `role="tablist"`/`aria-pressed` as appropriate. |
| **Input / SearchField** | Pill, height 36px (forms 44px), bg `--fill-1`, no border, padding 0 12px, leading search icon 15px secondary, placeholder secondary. Focus: `--focus-ring`. Search in sidebar shows `⌘K` hint (11px tertiary) and opens existing search if any. |
| **Select / Dropdown / Popover / ContextMenu / Tooltip** | Surface = `glass` with `rounded-inner` (menus 16px), padding 6px; items `rounded-item`, height 36px, hover `--fill-1`. Tooltip: small glass pill, 12px. |
| **Dialog / Sheet / AlertDialog** | Overlay `rgba(0,0,0,0.25)` + `backdrop-filter: blur(4px)`. Content: `glass`, `rounded-panel`, padding 24px, max-width per existing usage. Footer buttons right-aligned pills. Sheet slides with `--ease-glass`. |
| **StatusBadge** (new; restyle Badge) | Inline pill, padding 3px 10px, 12px/600, `variant: success \| warning \| neutral \| info \| danger` using the status tokens. `info` with a live 6px dot = "In progress". |
| **ProgressRing** (new) | SVG 132px, r 56, stroke 12, track `--fill-2`, value stroke `--accent`, round caps, starts at 12 o'clock. Centre: value 24px/700 tabular + caption "of 8:00". |
| **ProgressBar** | 6px tall pill, track `--fill-2`, fill `--accent`. |
| **StatTile** (new) | GlassPanel size `tile`. Row 1: label (13/600 secondary) left, 30px icon tile right (`rounded-icon`, bg `--fill-raised`, icon 16px). Row 2: value 30px/700 tabular + unit 14px secondary. Row 3: caption 12px secondary. Gap 10px. |
| **Table** | Inside a GlassPanel with padding 8px. Header row 12px/600 secondary, no background. Cells padding 11px 14px, 14px tabular; rows separated by 1px `--separator` top border; no zebra stripes; row hover `--fill-1`. Wrap in `overflow-x: auto` with table `min-width: 640px`. |
| **Slider** | Native/Radix slider with track `--fill-2`, range + thumb in `--accent`, thumb white with soft shadow, 28px tall hit area. |
| **Switch / Checkbox / Radio** | Accent fill when on; switch track pill 51×31 (iOS proportions). |
| **Toast** | `glass-sm`, `rounded-inner`, bottom-centre on mobile, bottom-right on desktop. |
| **Skeleton** | `--fill-1` with a subtle shimmer; radius matches the element it replaces. |
| **Empty state** | Centered inside a GlassPanel: 44px icon in a `--fill-1` circle, 17px/650 title, 14px secondary description, optional primary button. |

Icons: keep the project's icon library (likely lucide). Stroke width 1.8–2, sizes 15–18px, colour `currentColor`. No emoji anywhere.

---

## 4. App shell

### 4.1 Layout

```
<body>  (wallpaper)
  <div class="shell">  padding: 16px; display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; min-height: 100dvh
    <nav  class="sidebar"> flex: 1 1 232px; position: sticky; top: 16px (desktop only)
    <main class="content"> flex: 999 1 560px; min-width: 0; display:flex; flex-direction: column; gap: 16px
```

- **≥1024px:** sidebar visible, sticky, `max-height: calc(100dvh - 32px)`, internal scroll if needed.
- **<1024px:** sidebar hidden; a 44px glass circle menu button (top-left of the page header) opens it as a left Sheet with the same glass styling. Content goes full width.

### 4.2 Sidebar (floating glass)

`glass`, `rounded-panel`, padding 14px, flex column, gap 14px. Top to bottom:

1. **Brand row** (padding 4px 6px, gap 10px): 34px `rounded-icon` tile filled with `--accent` + white pulse-line icon (`M3 12h4l2-6 4 12 2-6h6`, stroke 2.2), inset highlight `rgba(255,255,255,0.45)`. Text: "WorkPulse" 15px/650, under it "NIST Workspace" 12px secondary.
2. **SearchField** (36px pill, `⌘K` hint).
3. **Section "WORKSPACE"** (11px uppercase label, padding 6px 10px 4px) then nav items:
   Attendance · Business Trips · Reimbursement · Reports · Contacts · Bookmarks · Dictionary · Resources · Mail
   (use the app's real routes/labels; keep any that exist but aren't listed).
4. **Section "MANAGE":** Shared with me · Admin (Admin only for admins, as today).
5. **Profile card** (pushed to bottom with `margin-top: auto` when sticky): padding 10px, radius 18px, bg `rgba(255,255,255,0.5)` light / `rgba(255,255,255,0.06)` dark, 1px `--glass-border`. 34px circle avatar (initials, bg `#2C2C30`, white 13px/600), name 13px/600, sub-line 12px secondary, Settings IconButton on the right.

**Nav item:** `<a>` (Next `Link`), min-height 40px, padding 0 10px, `rounded-item`, gap 10px, icon 18px stroke 1.8 tertiary colour, label 14px/500 body colour. Hover: `--fill-1`. Optional count badge on the right (20px pill, `--fill-2`, 11px/600).
**Active item:** bg `--fill-raised` + `--fill-raised-shadow`, label 600 primary, icon stroke `--accent` width 2, `aria-current="page"`.

### 4.3 Page header (per page)

Flex-wrap row, gap 12px, padding 6px 4px 2px, no background.

- Left (flex 1 1 260px): h1 page title; subtitle 13px secondary (contextual, e.g. "Settlement period · Sep 21 – Oct 20, 2026").
- Right (wraps on mobile, gap 10px): page-specific ToolbarCapsules/SegmentedControl, then at most **one** primary Button.

---

## 5. Page specs

### 5.1 Attendance dashboard (reference screen, build first and match exactly)

Header: title **Attendance**, subtitle = current settlement period (respect custom settlement overrides).
Toolbar right, in order:
1. ToolbarCapsule month stepper: ‹ IconButton · "October 2026" 14px/600 · › IconButton.
2. SegmentedControl **Month / Period / Year** (map to existing views; if Year doesn't exist, show only what exists).
3. ToolbarCapsule with IconButtons: Import from Excel (download-arrow icon), Export to Excel (upload-arrow icon), Notifications (bell) if the app has notifications. Omit what doesn't exist.
4. Primary Button **"+ Log time"** (opens existing log entry UI).

**Row 1** (flex-wrap, gap 16px):
- **Today card** (GlassPanel, padding 22px, flex 2 1 400px, flex-wrap row, gap 24px, items centered):
  ProgressRing (worked / standard day) → right column (gap 14px): eyebrow "Today · Friday, October 2" (13/600 secondary); heading "You're on the clock" / "Not clocked in yet" / "Done for today" (22/700); three mini stats in a wrapping row, gap 20px: *Clocked in*, *Standard end*, *Remaining* (or *Overtime* once past end), label 12px secondary over value 17px/600 tabular; buttons: primary **Clock in / Clock out** + glass **Add note**. Wire to existing login/logout recording.
- **Stat grid** (flex 3 1 480px, `grid-template-columns: repeat(2, minmax(0,1fr))`, gap 16px), four StatTiles from existing settlement summary data:
  *Work days* (`7` of `18`, caption "Period so far · 3 holidays"), *Overtime sessions*, *Overtime total*, *Avg. clock-in* (only if computable client-side from existing data; otherwise use another existing summary metric).

**Row 2** (flex-wrap, gap 16px, align start):
- **Attendance log** (GlassPanel padding 8px, flex 3 1 560px): header row padding 12px 14px 10px with h2 "Attendance log" + "See all" link (link colour). Table columns **Date** (bold date + secondary weekday) · **In** · **Out** · **Worked** · **Overtime** · **Status**. Empty values = "—". Status → StatusBadge: today running = info "In progress" with dot; overtime = warning "Overtime"; normal = success "On time"; holiday/weekend = neutral with the holiday name (e.g. "Autumnal Equinox"). Keep existing edit interactions (row click / menu).
- **Right column** (flex 1 1 300px, column, gap 16px):
  - **Next business trip** card: eyebrow + StatusBadge (Approved = success, Pending = warning, Draft = neutral); route "Tokyo → Osaka" 22/700; dates + "Domestic" 14px secondary; ProgressBar "Receipts for settlement · 2 of 5"; full-width glass Button "Upload receipts". Hide card if no upcoming trip (or show compact empty state "No upcoming trips").
  - **Weekly report** card: eyebrow "Weekly report" + "Week 40 · Draft" caption; 2–3 line clamp of the draft text (14px/1.5 body colour); link "Continue writing →".

### 5.2 Settings › Appearance (reference screen #2)

Header: title **Settings**, subtitle "Personalize how WorkPulse looks on this device".
Below header: a SegmentedControl-style **tab bar** (glass-sm pill, wraps on mobile) with the existing settings sections, e.g. Account · Security · Appearance · Sharing · Data & Export.

Content row (flex-wrap, gap 16px):
- **Settings list** (GlassPanel, padding 8px 20px, flex 3 1 520px). Grouped rows separated by `--separator`, each row padding 18px 0:
  1. **Theme** — three 120×78 preview tiles (`rounded-thumb`, padding 8px) showing a mini sidebar + two cards in that theme (System = half light / half dark). Label under each (13/500). Selected: 2px `--accent` outline, offset 3px; unselected: 2px subtle outline.
  2. **Accent color** — left: title + current colour name (13px secondary); right: 26px circular swatches inside 44px buttons, `role="radiogroup"`; selected swatch gets 2px outline in primary text colour, offset 2px.
  3. **Text size** — title + live value "15 px" on the right; slider with small "A" (12px) and large "A" (20px) at the ends.
  4. **Liquid Glass** — title + description "Transparency of the sidebar, cards and toolbars across the app"; value chip "60%" (pill, `--fill-2`, 13/600); slider labelled **Tinted** (left, 0) ↔ **Clear** (right, 100).
- **Live preview** (GlassPanel, flex 2 1 320px): eyebrow "Preview"; a 230px `rounded-inner` box with its own vivid wallpaper (blue/orange/purple blobs) containing a floating glass mini "Today" card (text 12px / size+7px bold / size px) and two pills (primary "Clock out", glass "Add note"); caption under it explaining the slider.

All four controls update the **whole app live** via §2.4 (dragging intensity visibly changes the sidebar and every card, not only the preview).

### 5.3 Apply the system to every other page

For each remaining route, keep the content and behaviour; change only the presentation:

- **Every page:** page header per §4.3; every content block in a GlassPanel; primary action as the single primary Button; secondary actions in ToolbarCapsules; filters as SegmentedControls or pill Selects; lists/tables per §3 Table; status values as StatusBadges; empty states per §3.
- **Business Trips:** list as table or cards of trips (route, dates, domestic/overseas badge, status badge, receipts progress bar). Trip detail: header with status, sections (application, settlement, documents) as separate GlassPanels; document list rows with file icon, name, size, Drive-mirror indicator.
- **Reimbursement:** category filter SegmentedControl / pill select; upload zone = dashed 1.5px `--separator`-coloured border inside a GlassPanel, `rounded-inner`, accent on drag-over.
- **Reports (daily/weekly):** note-style editor → two-pane on desktop: left glass list of reports (date + title + 1-line preview, active item uses nav-active style), right GlassPanel editor with roomy padding (32px), 16px/1.6 body text, toolbar as a ToolbarCapsule.
- **Contacts:** search pill + department SegmentedControl/select; contacts as table on desktop, rows with 34px initial avatars.
- **Bookmarks / Resources:** grid of tile cards (`rounded-tile`, favicon/icon tile, title, domain caption); import/export Chrome bookmarks in a ToolbarCapsule.
- **Dictionary:** large search field (44px pill); results as cards with the word (22/700), reading, meaning, and JLPT level as StatusBadge (N5…N1 using neutral/info variants).
- **Mail (Gmail labels):** labels list in an inner panel, messages in a table-like list; "Connect Gmail" empty state.
- **Shared with me / sharing dialogs:** permission shown as StatusBadge (Read = neutral, Edit = info).
- **Admin:** user table with role/status badges; destructive actions use destructive Button inside a confirm AlertDialog.
- **Settings (other tabs):** same grouped-rows list style as Appearance. Sessions list rows with device icon + "This device" info badge. 2FA code input = 6 separate 44px rounded-item boxes.
- **Auth (login, register, 2FA):** wallpaper background, centered GlassPanel (max-width 400px, padding 32px), brand row on top, 44px inputs, full-width primary Button.

---

## 6. Accessibility & quality bar

- Text contrast ≥ 4.5:1 on glass at intensity 0.6 **and** at 1.0 in both themes; if the clearest setting fails somewhere, clamp `--glass-alpha` minimum (light ≥ 0.40, dark ≥ 0.20).
- Visible focus on every interactive element: `box-shadow: var(--focus-ring)` (or outline 2px accent, offset 2px).
- Real `<button>`, `<a>`, `<input>`/`<label>`; icon-only buttons have `aria-label`; active nav `aria-current="page"`.
- Status colours always paired with text (never colour alone).
- `prefers-reduced-transparency` → near-solid panels; `prefers-reduced-motion` → no scale/slide.
- Works at 390px width: header actions wrap, stat grid stays 2 columns, tables scroll horizontally inside their panel, no page-level horizontal scroll.

## 7. Performance

- Only top-level surfaces use `backdrop-filter` (sidebar, page-level cards, toolbar capsules, menus, dialogs). Nested elements use fill tokens.
- Never put `glass` on table rows, list items or anything rendered in long loops.
- Wallpaper uses `background-attachment: fixed` on body; if scrolling jank appears on Safari/iOS, switch to a `position: fixed; inset: 0; z-index: -1` wallpaper div.
- No new runtime dependencies unless already installed (no animation libraries required).

---

## 8. Implementation phases (commit after each)

1. **Phase 0 – Audit & plan** (§1). Report, wait for approval.
2. **Phase 1 – Tokens & wiring:** §2 into globals.css + `@theme inline`; map shadcn vars; theme provider sets `--glass-intensity`, `--accent`, `--accent-foreground`, root font size live. Verify by toggling settings.
3. **Phase 2 – Primitives:** §3 (restyle existing, add GlassPanel, IconButton, ToolbarCapsule, SegmentedControl, StatusBadge, ProgressRing, StatTile). If Storybook or a `/dev` playground exists, add examples there; otherwise create a temporary `app/(dev)/ui-preview/page.tsx` showing every primitive in both themes and remove it before the final commit.
4. **Phase 3 – App shell:** §4 (sidebar, mobile sheet, page header).
5. **Phase 4 – Attendance dashboard** (§5.1), matched exactly.
6. **Phase 5 – Settings › Appearance** (§5.2) incl. live preview.
7. **Phase 6 – All remaining pages** (§5.3), one commit per page group.
8. **Phase 7 – QA pass:** acceptance checklist below; fix leftovers (hard-coded colours: grep for `#[0-9a-fA-F]{3,6}`, `bg-white`, `bg-gray-`, `border-gray-`, `shadow-md` etc. outside the tokens file).

## 9. Acceptance checklist

- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` pass.
- [ ] No behaviour/API changes (diff touches only styling, markup structure and theme wiring).
- [ ] Attendance dashboard matches §5.1 layout, sizes and colours in light **and** dark.
- [ ] Settings › Appearance: theme, accent, text size and Liquid Glass intensity all update the entire app live and persist as before.
- [ ] Intensity 0 → panels nearly solid; 100 → clearly see-through but text still legible.
- [ ] Every page uses GlassPanel / primitives; no leftover default shadcn grey cards.
- [ ] 390px mobile: sidebar in sheet, no horizontal page scroll, all targets ≥ 44px.
- [ ] Keyboard: Tab reaches every control with a visible focus ring.
- [ ] Reduced transparency and reduced motion respected.
- [ ] No hard-coded colours outside the tokens file.

When finished, give me: a summary per phase, list of files changed, anything you couldn't map (e.g. a stat the API doesn't provide) and screenshots/notes for light, dark and mobile.

---

## 10. Implementation status (as of 2026-10-07, app version 2.1.0)

Phases 0–6 have shipped (commits `f012579`…`0e93e61` on `main`). This section records decisions
that permanently diverge from the brief above (don't re-litigate these), what's still missing
against §5.3/§9, and what was added beyond the brief at the user's request. Read this before
making further changes.

### Decisions that override sections above

- **§3 icons:** sidebar nav uses plain lucide-react stroke icons, not the squircle glass badges
  this repo's `components/ui/ICON_DESIGN.md` previously locked in. That icon system is superseded
  for nav — it's still used for Home tile icon chips' colour (not the badge shape) and Settings
  section icons.
- **§0 scope:** this fully replaced the prior "macOS 27 Golden Gate" visual system (shipped as
  v1.13), not layered beside it. There is no theme switch between the two.
- **§2.3/§2.4 glass intensity direction:** the stored setting (`localStorage` + backend
  `AppSettings.GlassIntensity`, both still 0–100) keeps its pre-v2 direction (0 = clear,
  100 = tinted) so existing saved values didn't need a migration. Only the CSS variable
  `--glass-intensity` is computed as `(100 - stored) / 100` to match this brief's 0 = tinted,
  1 = clear convention. The Settings slider shows/collects the brief-facing (inverted) value.
- **§2.4 accent list:** kept the app's existing 6-preset list (blue/purple/teal/orange/rose/green)
  instead of this brief's list, per the brief's own "if the app's existing accent list differs,
  keep its list" clause. Light-mode purple was deepened to `#7a3fd1` to clear 4.5:1 contrast.
  `--primary`/`--primary-foreground` now alias `--accent`/`--accent-foreground`.
- **§4.2 sidebar:** the nav list's own search/filter input was dropped; the sidebar search field
  opens the app's existing Spotlight (⌘K) instead, per "opens existing search if any." The
  pre-existing Sidebar Size setting still works but now only changes width, not row/icon density.
  Sidebar subtitle is literally "NIST Workspace" per this doc's own example copy.

### §5.1 Attendance — resolved differently than spec'd

- **Clock in / Clock out** are implemented without a new backend endpoint: they open the existing
  attendance entry dialog prefilled with the current time, reusing its save/overtime/validation
  logic, instead of a dedicated instant clock-in API.
- **Add note** stays a disabled placeholder — there's no notes field on an attendance record.
- **Next business trip → receipts progress bar** ("2 of 5") was not built — no receipts-target
  field exists on a trip to measure progress against. The card still shows route/dates/status only.
- **Weekly report card** stays a disabled placeholder — Weekly Reports is a disabled nav item in
  this app, not a shipped feature.
- **Avg. clock-in** (one of the four §5.1 stat tiles) is live, computed client-side from WorkDay
  login times — all four stat tiles are implemented, not three.
- **Added beyond spec:** a Month / Period / Year view switch (SegmentedControl in the toolbar).
  Month = calendar month, Period = this app's native settlement period, Year = every calendar
  month in the selected year (fetched on demand, not pre-loaded).

### Home page — redesigned beyond §5.3 (§5.3 didn't cover Home)

Home originally kept its pre-v2 look: full-bleed saturated gradient tiles (white text on a
per-item color wash) in a hand-placed bento grid (`GRID_POSITION`, explicit row/col spans). At the
user's request this was replaced to match every other page: small `rounded-icon` colour-chip icons
(15%-tint background, token text colours) on plain `glass`/`rounded-tile` panels, StatTile-style
typography (13px secondary label → bold value → secondary caption), and a plain responsive grid
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) instead of the bento layout. Weather and clock
widgets, the nav tiles, and the recently-viewed strip all follow this now.

### Still open against §5.3 / §9

- **Contacts** is still a card grid, not a desktop table.
- **Business Trips** detail view isn't split into per-section GlassPanels; document rows don't yet
  show file icon/size/Drive-mirror indicator.
- **Reimbursement** upload zone hasn't been changed to the dashed-border drag style.
- **Settings**: the grouped-rows list style (§5.2) was only applied to Appearance. Other tabs
  (Account, Security, Sharing, Data & Export, Google Drive, Gmail) still use the pre-v2
  drill-down/RowLink pattern, and there's no single segmented tab bar across all sections — the
  page kept its existing left-hand section nav.
- **Toast** (§3) exists as a component but nothing calls it yet — no provider/queue wired up.
- **`/ui-preview` playground** (§8 Phase 2) was never created.
- **§9 checklist**: not run by a human/browser. No verified contrast at intensity 0/100, no
  verified 390/402/440px layout, no keyboard-focus walkthrough, no screenshots. Every phase so far
  has only been checked with `tsc`/`eslint`/`next build` — treat the checklist as outstanding.
