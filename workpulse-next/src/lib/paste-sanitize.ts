// Cleans HTML from the clipboard (Excel/Word/web pages) before it's ever inserted into an
// editable area — pasted HTML can't be trusted the same way typed text can: it may carry
// <script>/event-handler XSS payloads, javascript: links, or (from Office apps specifically)
// a wall of proprietary mso-* markup that would otherwise bloat every note. This is a strict
// allowlist (tags, then attributes per tag), not a blocklist — anything not explicitly permitted
// is dropped, which is the only sanitizer shape that's safe against attack vectors nobody's
// thought to test for yet.

const ALLOWED_TAGS = new Set([
  "P", "DIV", "SPAN", "BR",
  "H1", "H2", "H3", "H4",
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "MARK", "SUB", "SUP",
  "UL", "OL", "LI",
  "A",
  "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
  "BLOCKQUOTE", "PRE", "CODE",
  "IMG",
]);

// Only these CSS properties survive a `style` attribute — enough to keep an Excel table's colors/
// borders/alignment/bold weight, nothing that can smuggle behavior (no `background: url(...)`,
// no `content`, no `expression()` legacy IE tricks).
const ALLOWED_STYLE_PROPS = new Set([
  "color", "background-color", "font-weight", "font-style", "text-decoration",
  "text-align", "vertical-align", "width", "height",
  "border", "border-color", "border-width", "border-style",
  "border-top", "border-right", "border-bottom", "border-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
]);

const SAFE_URL_PATTERN = /^(https?:|mailto:)/i;
const SAFE_IMAGE_SRC_PATTERN = /^(https?:|data:image\/(png|jpe?g|gif|webp);base64,)/i;

function sanitizeStyle(value: string): string {
  return value
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase();
      return prop && ALLOWED_STYLE_PROPS.has(prop);
    })
    .join("; ");
}

function sanitizeElement(el: Element) {
  // Attribute allowlist is tag-specific and deliberately narrow — strips every `on*` handler,
  // every `class` (so pasted content can't smuggle in a selector that happens to match one of
  // this app's own styles), and any attribute this function doesn't explicitly recognize.
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name === "style") {
      const cleaned = sanitizeStyle(attr.value);
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
      continue;
    }
    if (name === "href" && el.tagName === "A") {
      if (!SAFE_URL_PATTERN.test(attr.value)) el.removeAttribute("href");
      continue;
    }
    if (name === "src" && el.tagName === "IMG") {
      if (!SAFE_IMAGE_SRC_PATTERN.test(attr.value)) el.remove();
      continue;
    }
    if ((name === "colspan" || name === "rowspan") && (el.tagName === "TD" || el.tagName === "TH")) {
      continue; // keep as-is, numeric table-structure attributes
    }
    el.removeAttribute(attr.name);
  }
  if (el.tagName === "A") {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }
}

export function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Walk depth-first so a disallowed element's children get promoted (unwrapped) up to its
  // parent before the element itself is removed — this is what keeps "table has a stray Word
  // <o:p> wrapper" from also eating the actual text inside it.
  function walk(node: Node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE) {
        child.remove();
        continue;
      }
      const el = child as Element;
      walk(el);
      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Unwrap rather than delete: a disallowed <span class="MsoNormal"> around real text
        // should keep the text, just lose the wrapper — matching what Gmail's paste actually
        // looks like (formatting simplified, content never silently dropped).
        while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
        el.remove();
        continue;
      }
      sanitizeElement(el);
    }
  }

  walk(doc.body);
  return doc.body.innerHTML;
}
