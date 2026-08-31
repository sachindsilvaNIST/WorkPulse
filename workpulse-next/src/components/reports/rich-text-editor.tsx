"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  Bold,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sanitizePastedHtml } from "@/lib/paste-sanitize";

// Above this, a pasted image is more likely a mistake (a whole screenshot of a monitor, a huge
// unresized photo) than useful content — base64-inlining it into the note's stored HTML would
// bloat that record for everyone who ever loads it. Kept generous: a real product screenshot or
// a pasted Excel range with a couple of images comfortably fits well under this.
const MAX_PASTED_IMAGE_BYTES = 5 * 1024 * 1024;

const TEXT_STYLES = [
  { tag: "P", label: "Body" },
  { tag: "H3", label: "Subheading" },
  { tag: "H2", label: "Heading" },
  { tag: "H1", label: "Title" },
  { tag: "BLOCKQUOTE", label: "Quote" },
  { tag: "PRE", label: "Monospace" },
];

const TYPING_CHECKPOINT_DELAY_MS = 500;
const MAX_HISTORY = 100;

// Apple Notes' own highlighter palette. Kept translucent (mixed toward transparent) rather than
// solid so the highlight reads as a soft glass tint over the dark theme instead of an opaque
// pastel block — which is also what fixes the original bug: white text was unreadable against a
// near-opaque light yellow. At low opacity the highlight renders dark enough for the app's
// existing (inherited, white) text color to stay legible, so text color intentionally isn't
// touched here.
const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#FFD60A" },
  { name: "Green", color: "#34C759" },
  { name: "Blue", color: "#0A84FF" },
  { name: "Pink", color: "#FF375F" },
  { name: "Purple", color: "#8B5CF6" },
];
const HIGHLIGHT_FILL_OPACITY = "22%";
const HIGHLIGHT_BORDER_OPACITY = "45%";

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Prevent the button from stealing focus (and the current text selection) from the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-4 w-px bg-white/10" />;
}

export function RichTextEditor({
  initialValue,
  onChange,
  onBlur,
  placeholder,
  className,
}: {
  initialValue: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  useEffect(() => {
    if (!showHighlightMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (!highlightMenuRef.current?.contains(e.target as Node)) setShowHighlightMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHighlightMenu]);

  // Link entry: the selection Range (for a new link) is saved at the moment "Link…" is invoked —
  // toolbar click or right-click — before focus moves into the dialog's text field and
  // window.getSelection() stops reflecting the editor's selection. editingAnchorRef instead holds
  // the actual <a> element when the invocation targeted an EXISTING link, so confirmLink() can
  // update it in place rather than create a new one alongside it.
  const savedRangeRef = useRef<Range | null>(null);
  const editingAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogIsEdit, setLinkDialogIsEdit] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isEdit: boolean } | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (!contextMenuRef.current?.contains(e.target as Node)) setContextMenu(null);
    }
    // Capture phase + stopPropagation so this menu's Escape doesn't also reach the note editor's
    // own Escape handler (which closes the whole note, Apple Notes-style) — Escape should only
    // dismiss the top-most overlay.
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [contextMenu]);

  // Manual undo/redo history. execCommand("undo") only tracks execCommand-driven changes and
  // typing — it never sees our own DOM mutations (highlight, checklist, indent), so relying on it
  // meant Undo silently skipped those actions. Snapshotting innerHTML ourselves makes every action
  // in this editor undoable uniformly, matching Apple Notes.
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue;
    historyRef.current = [initialValue];
    historyIndexRef.current = 0;
    // Runs once on mount only. This component is remounted via a `key={selectedId}` from
    // the parent whenever the selected record changes, so there's no need to re-sync on
    // every value change — doing so on our own input would fight the caret position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function currentHtml() {
    return ref.current?.innerHTML ?? "";
  }

  // Records a new undo step. Call after any completed action (a toolbar click, or a pause in
  // typing) — not on every keystroke, which would make Undo annoyingly granular.
  function checkpoint() {
    const html = currentHtml();
    const history = historyRef.current;
    if (history[historyIndexRef.current] === html) return;
    history.splice(historyIndexRef.current + 1); // drop any redo tail
    history.push(html);
    historyIndexRef.current = history.length - 1;
    if (history.length > MAX_HISTORY) {
      history.shift();
      historyIndexRef.current--;
    }
  }

  function undo() {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      checkpoint();
    }
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    restoreHistory();
  }

  function redo() {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    restoreHistory();
  }

  function restoreHistory() {
    const html = historyRef.current[historyIndexRef.current];
    if (ref.current) ref.current.innerHTML = html;
    onChange(html);
  }

  // Enter inside an ordinary cell still behaves normally (a line break within that cell) — this
  // only fires at the true last cell of a table's last row, where there's otherwise no way out:
  // Tab would move focus off the page entirely, and Enter alone just adds another line inside
  // that same cell forever. Escaping there to a fresh paragraph is what Word/Docs do too.
  function escapeTrailingTableOnEnter(): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
    const node = sel.anchorNode;
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
    const cell = el?.closest("td, th") as HTMLElement | null;
    if (!cell) return false;
    const table = cell.closest("table");
    if (!table || !ref.current?.contains(table) || table.nextElementSibling) return false;

    const row = cell.closest("tr");
    const lastRow = table.querySelector("tr:last-of-type");
    if (row !== lastRow || cell !== row?.lastElementChild) return false;

    commit(() => {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      table.after(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    });
    return true;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey && escapeTrailingTableOnEnter()) {
      e.preventDefault();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    onChange(e.currentTarget.innerHTML);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
      checkpoint();
    }, TYPING_CHECKPOINT_DELAY_MS);
  }

  function readImageAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Mirrors how Gmail's compose box behaves: paste a range from Excel and the table/colors/bold
  // come along as-is; paste a screenshot and it just appears inline. `text/html` wins when present
  // (a copied Excel range's images already reference stable URLs, so re-embedding them as base64
  // would only bloat storage for no benefit) — actual image clipboard items are the fallback,
  // for the case where there's no HTML at all (a straight screenshot copy).
  // A pasted table landing as the very last thing in the editor leaves no ordinary paragraph
  // after it — contentEditable then has nowhere else to put the caret, so clicking "below" the
  // table or pressing Enter at its last cell both just land back inside that last cell instead of
  // starting a new line, exactly like being trapped in Excel's own cell-to-cell Enter behavior.
  // Guarantees an escape hatch: an empty paragraph right after, with the caret already moved into
  // it, so continued typing goes there rather than back into the table.
  function ensureLineAfterTrailingTable() {
    const root = ref.current;
    if (!root || root.lastElementChild?.tagName !== "TABLE") return;
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    root.appendChild(p);
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const html = e.clipboardData.getData("text/html");
    if (html.trim()) {
      e.preventDefault();
      commit(() => {
        document.execCommand("insertHTML", false, sanitizePastedHtml(html));
        ensureLineAfterTrailingTable();
      });
      return;
    }

    const imageFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dataUrls = await Promise.all(
        imageFiles
          .filter((f) => f.size <= MAX_PASTED_IMAGE_BYTES)
          .map(readImageAsDataUrl)
      );
      if (dataUrls.length === 0) return;
      commit(() => {
        for (const url of dataUrls) {
          document.execCommand("insertHTML", false, `<img src="${url}" style="max-width: 100%;" />`);
        }
      });
      return;
    }

    // No HTML, no image — plain text (e.g. from a code editor or terminal). Let the browser's own
    // default plain-text paste happen rather than reimplementing it.
  }

  // Toolbar-driven actions all go through this: flush any pending typing checkpoint first (so
  // typing and the next action land in separate undo steps), apply the command, then checkpoint
  // immediately (each button click is its own undo step).
  function commit(mutate: () => void) {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      checkpoint();
    }
    mutate();
    checkpoint();
    onChange(currentHtml());
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    commit(() => document.execCommand(command, false, arg));
  }

  const URL_PATTERN = /^https?:\/\//i;

  // A single block-level ancestor for both range boundaries is required: <a> is inline and can't
  // legally contain (or safely be built across, via deleteContents()/insertNode()) block-level
  // elements like <div>/<p>, the same reason highlighting is confined per-block.
  function singleBlockOrNull(range: Range): HTMLElement | null {
    const startBlock = blockAncestor(range.startContainer);
    const endBlock = blockAncestor(range.endContainer);
    return startBlock === endBlock ? startBlock : null;
  }

  // Resolves what "Add/Edit Link" should act on right now, for the TOOLBAR button: editing the
  // existing link the caret/selection is inside, or creating a new one from a real text selection.
  // Requires a selection or a link under the caret — matching Apple Notes, you can't link nothing.
  function resolveLinkContext(): { anchor: HTMLAnchorElement | null; range: Range } | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);

    const el = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : (range.startContainer as HTMLElement);
    const anchor = el?.closest<HTMLAnchorElement>("a[href]") ?? null;
    if (anchor) return { anchor, range };

    if (!sel.isCollapsed && range.toString().trim() && singleBlockOrNull(range)) {
      return { anchor: null, range: range.cloneRange() };
    }
    return null;
  }

  function openLinkDialogWithContext(anchor: HTMLAnchorElement | null, range: Range) {
    editingAnchorRef.current = anchor;
    savedRangeRef.current = range;
    setLinkText(anchor ? anchor.textContent ?? "" : range.toString());
    setLinkUrl(anchor ? anchor.getAttribute("href") ?? "" : "");
    setLinkDialogIsEdit(!!anchor);
    setContextMenu(null);
    setShowLinkDialog(true);
  }

  function openLinkDialog() {
    const ctx = resolveLinkContext();
    if (!ctx) return;
    openLinkDialogWithContext(ctx.anchor, ctx.range);
  }

  function confirmLink() {
    const text = linkText.trim();
    const url = linkUrl.trim();
    if (!text || !URL_PATTERN.test(url)) return; // Ok is disabled for this case; guard anyway
    const anchor = editingAnchorRef.current;
    const range = savedRangeRef.current;
    setShowLinkDialog(false);
    ref.current?.focus();

    commit(() => {
      if (anchor) {
        // Editing in place — no range gymnastics needed, and it can't ever collide with an
        // unrelated selection since we're mutating the exact element the user invoked this on.
        anchor.textContent = text;
        anchor.setAttribute("href", url);
        return;
      }
      if (!range) return;
      const a = document.createElement("a");
      a.href = url;
      a.textContent = text;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      range.deleteContents();
      range.insertNode(a);

      const sel = window.getSelection();
      sel?.removeAllRanges();
      const after = document.createRange();
      after.setStartAfter(a);
      after.collapse(true);
      sel?.addRange(after);
    });
  }

  // Strips the <a> wrapper, keeping its text as plain content — available both from the Edit
  // Link dialog and directly from the right-click menu on an existing link.
  function removeLink() {
    const anchor = editingAnchorRef.current;
    setShowLinkDialog(false);
    setContextMenu(null);
    if (!anchor) return;
    ref.current?.focus();
    commit(() => unwrapElement(anchor));
  }

  // Right-click surfaces "Link…" (new) or "Edit Link" (existing) alongside the browser's native
  // menu — Cut/Copy/Paste etc. still work via keyboard, and the native menu is untouched for a
  // right-click that's neither on a link nor over a real selection.
  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (anchor) {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(anchor);
      editingAnchorRef.current = anchor;
      savedRangeRef.current = range;
      setContextMenu({ x: e.clientX, y: e.clientY, isEdit: true });
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!range.toString().trim() || !singleBlockOrNull(range)) return;
    e.preventDefault();
    editingAnchorRef.current = null;
    savedRangeRef.current = range.cloneRange();
    setContextMenu({ x: e.clientX, y: e.clientY, isEdit: false });
  }

  // A plain click on a link opens it in a new tab, per spec — but that means clicking a link's
  // text can no longer place the caret there the normal contentEditable way, so this must run on
  // mousedown (which is what actually places the caret) rather than click, or the caret would
  // already have moved into the link before this ever runs.
  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;
    e.preventDefault();
    window.open(anchor.href, "_blank", "noopener,noreferrer");
  }

  function textNodesIn(range: Range): Text[] {
    const root = range.commonAncestorContainer;
    const walker = document.createTreeWalker(
      root.nodeType === Node.TEXT_NODE ? (root.parentNode ?? root) : root,
      NodeFilter.SHOW_TEXT
    );
    const nodes: Text[] = [];
    let n = walker.nextNode();
    while (n) {
      if (range.intersectsNode(n)) nodes.push(n as Text);
      n = walker.nextNode();
    }
    return nodes;
  }

  function highlightBackground(color: string) {
    return `color-mix(in srgb, ${color} ${HIGHLIGHT_FILL_OPACITY}, transparent)`;
  }
  function highlightBorder(color: string) {
    return `inset 0 0 0 1px color-mix(in srgb, ${color} ${HIGHLIGHT_BORDER_OPACITY}, transparent)`;
  }

  // Replaces `el` with its own contents in place — used for both removing a highlight and
  // removing a link, since "undo the wrapper, keep the text" is the same operation either way.
  function unwrapElement(el: HTMLElement) {
    const parent = el.parentNode;
    while (el.firstChild) parent?.insertBefore(el.firstChild, el);
    parent?.removeChild(el);
    parent?.normalize();
  }

  function blockAncestor(node: Node): HTMLElement {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    return (el?.closest("p, h1, h2, h3, blockquote, li, div") as HTMLElement | null) ?? (ref.current as HTMLElement);
  }

  // Wraps `range` in one or more <mark> elements, one per block-level element it touches. This
  // matters for two reasons: <mark> is an inline element and can't legally contain a block like
  // <div>/<p>, and — more importantly — a naive single-mark wrap that falls back to
  // extractContents() for a range spanning multiple blocks can literally tear paragraphs out of
  // place (observed: two <div> lines emptied and stuffed inside one <mark>). Confining each mark
  // to a sub-range within one block makes that fallback safe no matter what the selection spans.
  function createHighlightMarks(range: Range, color: string) {
    const touchedNodes = textNodesIn(range);
    if (touchedNodes.length === 0) return;

    const groups: { block: HTMLElement; nodes: Text[] }[] = [];
    for (const node of touchedNodes) {
      const block = blockAncestor(node);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.block === block) lastGroup.nodes.push(node);
      else groups.push({ block, nodes: [node] });
    }

    let firstMark: HTMLElement | null = null;
    let lastMark: HTMLElement | null = null;
    for (const group of groups) {
      const first = group.nodes[0];
      const last = group.nodes[group.nodes.length - 1];
      const subRange = document.createRange();
      subRange.setStart(first, first === range.startContainer ? range.startOffset : 0);
      subRange.setEnd(last, last === range.endContainer ? range.endOffset : last.length);
      if (!subRange.toString()) continue; // nothing real to highlight in this block

      const mark = document.createElement("mark");
      mark.className = "note-highlight";
      mark.dataset.color = color;
      mark.style.backgroundColor = highlightBackground(color);
      mark.style.boxShadow = highlightBorder(color);
      try {
        subRange.surroundContents(mark);
      } catch {
        // Sub-range partially overlaps an existing inline element (e.g. <strong>) at its edge —
        // extract-and-wrap still only ever touches content within this one block.
        const fragment = subRange.extractContents();
        mark.appendChild(fragment);
        subRange.insertNode(mark);
      }
      // surroundContents()/extractContents() split the boundary text node(s) at the exact 0/length
      // offsets used above, which can leave behind empty zero-length text-node siblings even
      // though the whole node was wrapped. normalize() merges/removes those — without it, a
      // later selection spanning this mark would see those empty nodes as "unhighlighted"
      // siblings and wrongly conclude the selection ISN'T uniformly one existing highlight,
      // breaking the same-color-toggle-off and recolor-in-place logic above.
      mark.parentNode?.normalize();
      firstMark ??= mark;
      lastMark = mark;
    }

    if (firstMark && lastMark) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStartBefore(firstMark);
      newRange.setEndAfter(lastMark);
      sel?.addRange(newRange);
    }
  }

  // `execCommand("hiliteColor", ...)` is unreliable in Chromium/WebKit — it silently no-ops unless
  // `styleWithCSS` was enabled first, and even then offers no way to toggle a highlight back off
  // or pick a color. Wrapping the selection in a real <mark> we control gives us a working apply,
  // a color picker, and a genuine remove — matching Apple Notes' actual highlighter menu (color
  // swatches plus a "None" option, alongside the same-color-reclick toggle shortcut).
  function applyHighlight(color: string | null) {
    ref.current?.focus();
    const sel = window.getSelection();
    setShowHighlightMenu(false);
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    // Guards a range that is technically non-collapsed but contains no real text (e.g. spanning
    // only the gap between two block elements) — proceeding past this point previously caused
    // extractContents() to tear whole paragraphs out of the document. Never remove this check.
    if (!range.toString().trim()) return;

    commit(() => {
      // Compare via the actual text nodes the range touches, not range.startContainer/endContainer
      // directly — those can point at an ELEMENT (e.g. the editor root) rather than inside the
      // <mark> whenever the selection was made at the element level (Cmd+A, triple-click, or our
      // own selectNodeContents() calls), which would otherwise miss an existing highlight entirely
      // and wrap it in a second, nested <mark> instead of removing it. Empty text nodes are
      // filtered out too — surroundContents()/extractContents() can leave zero-length siblings
      // behind as a split artifact, and one sitting outside a mark would otherwise wrongly read as
      // "part of the selection but not highlighted", defeating the same-mark check below.
      const touchedNodes = textNodesIn(range).filter((n) => n.textContent && n.textContent.length > 0);
      const marks = touchedNodes.map((n) => n.parentElement?.closest<HTMLElement>(".note-highlight") ?? null);
      const singleMark = marks.length > 0 && marks[0] && marks.every((m) => m === marks[0]) ? marks[0] : null;

      if (color === null) {
        // "None" — remove whatever highlight covers the selection, regardless of its color.
        if (singleMark) unwrapElement(singleMark);
        return;
      }

      if (singleMark) {
        if (singleMark.dataset.color === color) {
          // Same color re-applied to an already-highlighted selection — remove it.
          unwrapElement(singleMark);
        } else {
          // Different color chosen — recolor in place rather than unwrap+rewrap.
          singleMark.dataset.color = color;
          singleMark.style.backgroundColor = highlightBackground(color);
          singleMark.style.boxShadow = highlightBorder(color);
        }
        return;
      }

      createHighlightMarks(range, color);
    });
  }

  // Checklists are plain <ul class="note-checklist"> lists — the checkbox is drawn entirely by
  // CSS (see globals.css), and "checked" is just a class on the <li>. That means pressing Enter
  // to continue the list uses the browser's native <li>-creation behavior and automatically gets
  // a checkbox rendered too, with no custom per-item DOM handling needed.
  function toggleChecklist() {
    ref.current?.focus();
    commit(() => {
      document.execCommand("insertUnorderedList");
      const anchor = window.getSelection()?.anchorNode;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      const ul = el?.closest("li")?.closest("ul");
      ul?.classList.toggle("note-checklist");
    });
  }

  // execCommand("indent") is only well-behaved inside a list (nests the <li> correctly). On a
  // plain paragraph/heading it converts the block into a <blockquote> in Chromium/WebKit — wrong
  // both semantically and visually here, since blockquote is already our actual "Quote" text
  // style. Indent plain blocks manually via margin instead.
  function changeIndent(direction: "in" | "out") {
    ref.current?.focus();
    commit(() => {
      const anchor = window.getSelection()?.anchorNode;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (el?.closest("li")) {
        document.execCommand(direction === "in" ? "indent" : "outdent");
        return;
      }

      let block = el?.closest("p, h1, h2, h3, blockquote, div") as HTMLElement | null;
      if (!block || block === ref.current) {
        document.execCommand("formatBlock", false, "<div>");
        const newAnchor = window.getSelection()?.anchorNode;
        const newEl = newAnchor instanceof Element ? newAnchor : newAnchor?.parentElement;
        block = newEl?.closest("p, h1, h2, h3, blockquote, div") as HTMLElement | null;
      }
      if (!block || block === ref.current) return;

      const current = parseInt(block.style.marginLeft || "0", 10);
      const next = direction === "in" ? Math.min(current + 40, 200) : Math.max(current - 40, 0);
      block.style.marginLeft = next ? `${next}px` : "";
    });
  }

  // Clicking a checklist item's checkbox zone (rather than its text) toggles "checked" instead of
  // just placing the caret there. Clicking a link is blocked here too — mousedown is what
  // actually places the caret in contentEditable, so preventing it here (rather than only on the
  // later click event, in handleContentClick) is what stops the caret landing inside link text
  // before the click handler gets a chance to navigate away instead.
  function handleContentMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    if (target.closest("a[href]")) {
      e.preventDefault();
      return;
    }

    const li = target.closest("li");
    if (!li || !li.parentElement?.classList.contains("note-checklist")) return;
    if (e.clientX - li.getBoundingClientRect().left > 30) return;
    e.preventDefault();
    commit(() => li.classList.toggle("checked"));
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-white/10 pb-2">
        <select
          className="h-7 cursor-pointer rounded-md border-none bg-transparent px-1.5 text-xs text-muted-foreground outline-none hover:bg-foreground/10"
          defaultValue="P"
          onChange={(e) => exec("formatBlock", `<${e.target.value}>`)}
        >
          {TEXT_STYLES.map((s) => (
            <option key={s.tag} value={s.tag}>
              {s.label}
            </option>
          ))}
        </select>
        <ToolbarDivider />
        <ToolbarButton icon={Bold} label="Bold" onClick={() => exec("bold")} />
        <ToolbarButton icon={Italic} label="Italic" onClick={() => exec("italic")} />
        <ToolbarButton icon={Underline} label="Underline" onClick={() => exec("underline")} />
        <ToolbarButton icon={Strikethrough} label="Strikethrough" onClick={() => exec("strikeThrough")} />
        <div ref={highlightMenuRef} className="relative">
          <ToolbarButton
            icon={Highlighter}
            label="Highlight"
            onClick={() => setShowHighlightMenu((v) => !v)}
          />
          {showHighlightMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-1.5 rounded-full border border-white/10 bg-popover/95 p-1.5 shadow-lg backdrop-blur-md">
              <button
                type="button"
                title="None"
                aria-label="Highlight None"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyHighlight(null)}
                className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground ring-1 ring-inset ring-white/20 transition-transform hover:scale-110 hover:text-foreground"
              >
                <Ban className="size-3.5" />
              </button>
              <div className="h-4 w-px bg-white/10" />
              {HIGHLIGHT_COLORS.map((h) => (
                <button
                  key={h.name}
                  type="button"
                  title={h.name}
                  aria-label={`Highlight ${h.name}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHighlight(h.color)}
                  className="size-5 cursor-pointer rounded-full ring-1 ring-inset ring-white/20 transition-transform hover:scale-110"
                  style={{ backgroundColor: h.color }}
                />
              ))}
            </div>
          )}
        </div>
        <ToolbarDivider />
        <ToolbarButton icon={List} label="Bulleted list" onClick={() => exec("insertUnorderedList")} />
        <ToolbarButton icon={ListOrdered} label="Numbered list" onClick={() => exec("insertOrderedList")} />
        <ToolbarButton icon={ListChecks} label="Checklist" onClick={toggleChecklist} />
        <ToolbarDivider />
        <ToolbarButton icon={IndentDecrease} label="Decrease indent" onClick={() => changeIndent("out")} />
        <ToolbarButton icon={IndentIncrease} label="Increase indent" onClick={() => changeIndent("in")} />
        <ToolbarButton icon={LinkIcon} label="Add link" onClick={openLinkDialog} />
        <ToolbarDivider />
        <ToolbarButton icon={Undo2} label="Undo" onClick={undo} />
        <ToolbarButton icon={Redo2} label="Redo" onClick={redo} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        onMouseDown={handleContentMouseDown}
        onClick={handleContentClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onBlur={onBlur}
        className={cn(
          "note-rich-text flex-1 overflow-y-auto text-sm leading-relaxed outline-none",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          "[&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold",
          "[&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-xl [&_h2]:font-semibold",
          "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_p]:mb-1",
          "[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through",
          "[&_a]:cursor-pointer [&_a]:text-primary [&_a]:underline",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
          "[&_pre]:m-0 [&_pre]:mb-1 [&_pre]:whitespace-pre-wrap [&_pre]:font-mono [&_pre]:text-[13px]"
        )}
      />

      {contextMenu &&
        createPortal(
          // Portaled to document.body: this component sits inside an ancestor Card styled with
          // backdrop-blur, and a backdrop-filter on any ancestor creates a new containing block
          // for position:fixed descendants — meaning without the portal, `left`/`top` (computed
          // from viewport-relative clientX/clientY) would be applied relative to that Card's box
          // instead of the viewport, landing the menu somewhere else on the page entirely.
          <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-36 rounded-xl border border-white/10 bg-popover/95 p-1 shadow-lg backdrop-blur-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => openLinkDialogWithContext(editingAnchorRef.current, savedRangeRef.current!)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10"
            >
              <LinkIcon className="size-3.5" /> {contextMenu.isEdit ? "Edit Link" : "Link…"}
            </button>
            {contextMenu.isEdit && (
              <button
                type="button"
                onClick={removeLink}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <Link2Off className="size-3.5" /> Remove Link
              </button>
            )}
          </div>,
          document.body
        )}

      {showLinkDialog && (() => {
        const urlTrimmed = linkUrl.trim();
        const isUrlValid = URL_PATTERN.test(urlTrimmed);
        const canSubmit = linkText.trim().length > 0 && isUrlValid;

        function handleDialogKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
          // preventDefault matters here: confirmLink() moves focus back into the contentEditable
          // mid-handler, and an un-prevented Enter keydown/keyup pair can then have its default
          // action (insert a line break) apply to the NEWLY focused editor instead of this input,
          // corrupting the note's content.
          if (e.key === "Enter") {
            e.preventDefault();
            if (canSubmit) confirmLink();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setShowLinkDialog(false);
          }
        }

        return createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowLinkDialog(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-popover p-5 shadow-xl">
              <h3 className="mb-3 text-sm font-semibold">{linkDialogIsEdit ? "Edit Link" : "Add Link"}</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Text</label>
                  <Input
                    autoFocus
                    type="text"
                    placeholder="Link text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    onKeyDown={handleDialogKeyDown}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Link</label>
                  <Input
                    type="text"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={handleDialogKeyDown}
                    aria-invalid={urlTrimmed.length > 0 && !isUrlValid}
                  />
                  {urlTrimmed.length > 0 && !isUrlValid && (
                    <p className="mt-1 text-xs text-destructive">Link must start with http:// or https://</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {linkDialogIsEdit ? (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={removeLink}>
                    <Link2Off className="size-3.5" /> Remove Link
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowLinkDialog(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={confirmLink} disabled={!canSubmit}>
                    Ok
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
