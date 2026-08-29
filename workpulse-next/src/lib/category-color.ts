const ACCENTS = ["#007AFF", "#FF9500", "#00C7BE", "#FF2D55", "#8B5CF6", "#34C759", "#FF3B30", "#5AC8FA"];
const NEUTRAL = "#6E6E73";

/** Deterministically maps a category label to one of a fixed accent palette. */
export function categoryColor(category: string | null | undefined): string {
  if (!category || category === "All") return NEUTRAL;
  let hash = 0;
  for (const c of category.toLowerCase()) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}

/** Diagonal accent-into-card gradient for list/grid cards (Bookmarks, Contacts, Reimbursement,
 * Resources, ...) — a soft two-stop wash rather than one flat tint, blended against `var(--card)`
 * so it stays legible and adapts automatically to light/dark theme. */
export function accentCardStyle(accent: string): { background: string; borderColor: string } {
  return {
    background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, var(--card)) 0%, color-mix(in srgb, ${accent} 6%, var(--card)) 100%)`,
    borderColor: `color-mix(in srgb, ${accent} 32%, transparent)`,
  };
}
