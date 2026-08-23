export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NUMERIC_PATTERN = /^[0-9]+$/;

/** Whether a single just-typed character is allowed anywhere in an email address, given what's
 * already in the field (only used to reject a second "@", everything else is a static charset
 * check). Intentionally permissive about which email is ultimately "complete" — EMAIL_PATTERN is
 * what decides that — this only blocks characters that can never be part of a valid address. */
export function isEmailKeystrokeAllowed(key: string, currentValue: string): boolean {
  if (key === "@" && currentValue.includes("@")) return false;
  return /^[A-Za-z0-9._%+\-@]$/.test(key);
}

export function isNumericKeystrokeAllowed(key: string): boolean {
  return /^[0-9]$/.test(key);
}

/** True for multi-character key names (Backspace, Delete, ArrowLeft, Tab, ...) and any keystroke
 * combined with a modifier that implies a shortcut (copy/paste/select-all) — both should always
 * pass through a keydown-based input filter untouched. */
export function isControlKeystroke(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1;
}
