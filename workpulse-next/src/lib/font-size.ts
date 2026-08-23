export const FONT_SIZE_STORAGE_KEY = "wp-font-size";

export const FONT_SIZE_SCALE: Record<string, string> = {
  Small: "14px",
  Medium: "16px",
  Large: "18px",
};

export const DEFAULT_FONT_SIZE_PRESET = "Medium";

/** Sets the root font-size, which every rem-based Tailwind size (the overwhelming majority of
 * this app's classes) scales from — so this one line resizes the whole UI, not just one element. */
export function applyFontSize(preset: string) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = FONT_SIZE_SCALE[preset] ?? FONT_SIZE_SCALE[DEFAULT_FONT_SIZE_PRESET];
}
