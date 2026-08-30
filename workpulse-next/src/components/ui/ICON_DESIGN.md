# Sidebar icon design system

The nav icons (`nav-glyphs.tsx`, `icon-badge.tsx`, consumed by `sidebar.tsx` via `nav-items.ts`)
follow a locked design system. Apply this to every icon — only the color palette and the glyph's
inner composition vary per icon.

## The five rules

1. **Flat badge, not glass.** `flatIconStyle()` in `icon-badge.tsx` — opaque 2-stop gradient, no
   backdrop blur, no border, no animated sheen. `IconBadge`'s default Liquid Glass treatment
   (`liquidGlassIconStyle` + `.liquid-sheen`) was tried on these badges and explicitly rejected.
   Pass `flat: true` on the `NavItem`.
2. **One highlight only, upper-left.** A single soft radial white glow, `soft-light` blended.
   Corner shadows / inset panel shadows were tried and rejected as "poor and gloomy" — don't add
   extra shadow layers to the outer badge.
3. **True squircle corners, not `border-radius`.** See `squirclePolygon()` — a computed
   superellipse (n≈5) applied via `clip-path`, not the CSS `border-radius` approximation.
4. **Self-contained, multi-layer inner glyph.** Filled shapes with their own colors, not a
   single-color stroke icon. Size generously — aim for ~85-90% of the 24×24 viewBox, not ~75%.
   The panel/dial-type backing layer can be translucent/glassy even though the outer badge stays
   flat — those are separate layers with separate treatments.
5. **Vivid gradients.** Wide hue span and real saturation between the two color stops, not a
   narrow muted pair.

## Explicit non-goal

Original artwork only — simple hand-drawn geometric primitives (rects, circles, basic paths).
Never SF Symbols, never assets sourced from the internet as "Apple icon clones," never a redesign
close enough to a specific Apple icon (e.g. the Home app's actual house glyph) to stop being
original. Apple's SF Symbols / Icon Composer license covers apps built for Apple's own platforms —
not this web app — regardless of who performs the export/wiring step. Two open-source icon
libraries (Phosphor, then Heroicons Solid) were tried before landing on this fully custom approach
— don't revert to a third-party icon library without being asked.

## Workflow for a new icon

1. Get a color-family instruction and any inner-layer concept from the user.
2. Preview in an Artifact first (light + dark grounds, real production CSS) — don't wire in blind.
3. Once approved: add/update the glyph component in `nav-glyphs.tsx`, set
   `color`/`color2`/`flat: true` on the item in `nav-items.ts`, verify with
   `tsc`/`eslint`/`next build`, restart the local dev server.

Full history/reasoning: see the `feedback_liquid_glass_icon_design` Claude memory entry for this
project (covers the specific back-and-forth that produced each rule above).
