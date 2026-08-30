import type { ComponentType, CSSProperties, SVGProps } from "react";
import { cn } from "@/lib/utils";

/** The visual recipe behind real Apple app icons (iOS home screen: Mail's blue-to-deep-blue
 * envelope, Photos' saturated flower, ...) — a top-lightened-to-bottom-darkened vertical gradient
 * for real dimensionality, a glossy top inset highlight, and a soft drop shadow so the badge lifts
 * off the page. This is about background richness, not glyph weight — the icon glyph itself stays
 * at its normal (not bold) stroke width; boldness read as cheap, gradient depth reads as "real
 * icon". Exported separately from IconBadge so callers stuck using a `children` API (icon already
 * rendered by the caller, e.g. Settings' SectionIcon) can still apply the same background/shadow
 * recipe without going through the component. */
export function appleIconStyle(color: string, color2?: string): CSSProperties {
  const to = color2 ?? color;
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, ${color} 78%, white 22%) 0%, ${color} 42%, ${to} 68%, color-mix(in srgb, ${to} 82%, black 22%) 100%)`,
    boxShadow:
      "inset 0 1.5px 1px rgba(255,255,255,0.55), inset 0 -8px 14px -8px rgba(0,0,0,0.4), 0 4px 10px -3px rgba(0,0,0,0.45)",
  };
}

export const APPLE_ICON_GLYPH_STYLE: CSSProperties = { filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" };

/** lucide-react icons are outline-only (hollow, thin-stroke) — nothing like SF Symbols' mostly
 * solid/filled glyphs that Apple's own Settings icons use. `fill="currentColor"` turns the glyph
 * into a filled silhouette instead of a hollow outline, with a lighter stroke left just to keep
 * fine internal details readable rather than dropping into a fill-only blob. Still used by the
 * pages that render lucide icons directly (Settings, Spotlight's non-nav results, ...) — the main
 * nav icon set itself has since moved to Heroicons' solid style (see nav-items.ts), which is
 * already a filled glyph by construction and needs no fill/stroke workaround at all. */
export const APPLE_ICON_GLYPH_PROPS = { fill: "currentColor" as const, strokeWidth: 1.25 };

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** True computed superellipse ("squircle") corner — |x|^n + |y|^n = 1 with n≈5, matching Apple's
 * own icon corner more closely than a pure n=4 squircle (slightly squarer, less lens-like) — used
 * instead of the `rounded-[22%]` border-radius approximation, which can't reproduce a superellipse
 * (border-radius corners are quarter-circles). Sampled as a polygon since CSS clip-path has no
 * native superellipse primitive. Computed once at module load, not per render. */
function squirclePolygon(n: number, steps: number): string {
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${((x + 1) / 2) * 100}% ${((y + 1) / 2) * 100}%`);
  }
  return `polygon(${pts.join(",")})`;
}

export const SQUIRCLE_CLIP_PATH = squirclePolygon(5, 64);

/** Liquid Glass badge recipe — a translucent, frosted fill (not an opaque gradient) plus a glass
 * edge highlight, used specifically for the sidebar's nav glyphs (see nav-glyphs.tsx). Works in
 * both light and dark theme by construction: it's built entirely from the item's own accent color
 * mixed toward transparent via color-mix(), never a literal light/dark surface color, so there's
 * nothing to re-tune per theme — the glass always reads against whatever's behind it. */
export function liquidGlassIconStyle(color: string, color2?: string): CSSProperties {
  const to = color2 ?? color;
  return {
    background: `linear-gradient(135deg, color-mix(in srgb, ${color} 65%, transparent) 0%, color-mix(in srgb, ${to} 45%, transparent) 100%)`,
    border: "1px solid color-mix(in srgb, white 35%, transparent)",
    boxShadow:
      "inset 0 1px 1px color-mix(in srgb, white 45%, transparent), inset 0 -6px 10px -6px rgba(0,0,0,0.35), 0 4px 12px -4px rgba(0,0,0,0.35)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };
}

/** Flat badge recipe (no glass) — a single upper-left highlight over an opaque gradient, no blur,
 * no border, no moving sheen. Reserved for glyphs that already carry their own internal depth
 * (e.g. Home's container-panel-plus-tiles) where the glass treatment competed with the glyph
 * instead of complementing it. */
export function flatIconStyle(color: string, color2?: string): CSSProperties {
  const to = color2 ?? color;
  return {
    background: `radial-gradient(circle at 25% 20%, rgba(255,255,255,0.7), transparent 50%), linear-gradient(135deg, ${color} 0%, ${to} 100%)`,
    backgroundBlendMode: "soft-light, normal",
    boxShadow: "0 3px 7px -2px rgba(0,0,0,0.5)",
  };
}

/** Apple-style app-icon badge — see appleIconStyle() for the gradient/gloss/shadow recipe.
 * `rounded-[22%]` approximates Apple's superellipse corner rounding proportionally at any size,
 * rather than a fixed pixel radius that only looks right at one icon size. Uses the Liquid Glass
 * recipe above plus the app's existing `.liquid-sheen` sweep (see globals.css) — the same
 * translucent-plus-moving-highlight language as the Home page's widgets — unless `flat` is set,
 * in which case it uses flatIconStyle() instead (see above) and skips the sheen overlay. */
export function IconBadge({
  icon: Icon,
  color,
  color2,
  size = "size-8",
  iconSize = "size-5",
  flat = false,
  className,
}: {
  icon: IconComponent;
  color: string;
  color2?: string;
  size?: string;
  iconSize?: string;
  flat?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex shrink-0 items-center justify-center text-white", size, className)}
      style={{ ...(flat ? flatIconStyle(color, color2) : liquidGlassIconStyle(color, color2)), clipPath: SQUIRCLE_CLIP_PATH }}
    >
      {!flat && <div className="liquid-sheen pointer-events-none absolute inset-0" />}
      <Icon className={cn(iconSize, "relative")} style={APPLE_ICON_GLYPH_STYLE} />
    </div>
  );
}
