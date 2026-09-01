"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Download, Maximize2, Minimize2, Plus, Search, Trash2, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/reports/rich-text-editor";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { downloadBlob } from "@/lib/api/client";

export interface NoteRecord {
  id: string;
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Restoring the last-open note should happen once per real page load (an actual browser
// refresh), never when this component simply remounts because the user switched tabs and
// navigated back within the app — module scope survives client-side route changes but gets
// reset to empty on a true reload, which is exactly the distinction we need. Keyed per
// basePath since Daily and Weekly Reports share this component but should restore independently.
const restoredThisPageLoad = new Set<string>();

interface NoteApi<T extends NoteRecord> {
  getAll: () => Promise<T[]>;
  create: (record: Partial<T>) => Promise<T>;
  update: (id: string, record: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

interface PendingEdit {
  id: string;
  title: string;
  body: string;
  date: string;
}

/**
 * Apple Notes-style sidebar-list + inline-editor, with silent background
 * autosave (no Save button, no visible status text) — same UX as the
 * desktop/Blazor report editors.
 *
 * Autosave is debounce-scheduled but ALWAYS flushed synchronously before the
 * selection changes, before unmount, and best-effort on tab close/refresh —
 * relying on the debounce timer alone loses in-flight edits the instant you
 * switch records or reload, since a pending setTimeout never survives either.
 */
export function NoteEditor<T extends NoteRecord>({
  icon: Icon,
  heading,
  subheading,
  dateField,
  dateLabel,
  api,
  basePath,
  makeNew,
  onExport,
}: {
  icon: LucideIcon;
  heading: string;
  subheading: string;
  dateField: keyof T;
  dateLabel: string;
  api: NoteApi<T>;
  /** e.g. "/api/dailyreports" — needed for the beforeunload beacon, which can't go through `api` generically. */
  basePath: string;
  makeNew: () => Partial<T>;
  /** Exports the given ids as an XLSX or HTML file — same shape as dailyReportsApi/weeklyReportsApi's
   * exportReports, kept optional so any future NoteEditor consumer without a backend export
   * endpoint doesn't have to fake one. */
  onExport?: (ids: string[], format: "xlsx" | "html") => Promise<{ blob: Blob; fileName: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [records, setRecords] = useState<T[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Bulk-select mode for exporting one or more entries — separate from the single-selection
  // "open this entry in the editor" state above, since you can multi-select for export without
  // ever opening anything in the editor pane.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"xlsx" | "html">("xlsx");
  const [exporting, setExporting] = useState(false);

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleExportSelected() {
    if (!onExport || selectedIds.size === 0) return;
    setExporting(true);
    try {
      const { blob, fileName } = await onExport(Array.from(selectedIds), exportFormat);
      downloadBlob(blob, fileName);
      setSelectMode(false);
      setSelectedIds(new Set());
    } finally {
      setExporting(false);
    }
  }

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dateValue, setDateValue] = useState("");
  // Gmail-compose-style expand — same content, just given the whole viewport instead of the
  // editor panel's own bounds, for writing a long entry without fighting a cramped column.
  const [fullscreen, setFullscreen] = useState(false);

  const pendingRef = useRef<PendingEdit | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newIdsRef = useRef<Set<string>>(new Set());

  // Remembers which record was open (per report type) so a page refresh reopens it instead of
  // landing on the empty "Select an entry" placeholder — the data was never gone, just deselected.
  const storageKey = `workpulse.noteeditor.selected:${basePath}`;

  function persistSelection(id: string | null) {
    setSelectedId(id);
    // The sidebar (the only way to change selection) isn't visible while fullscreen, so this
    // only ever fires for the null case in practice — closing the note. Reset here regardless,
    // rather than in an effect, since this is the actual point selection changes.
    setFullscreen(false);
    if (typeof window === "undefined") return;
    if (id) localStorage.setItem(storageKey, id);
    else localStorage.removeItem(storageKey);
  }

  useEffect(() => {
    api.getAll().then((list) => {
      setRecords(list);
      setLoading(false);

      // Spotlight's `?open=<id>` and `?new=1` both win over the page-load restore below and the
      // "most recent" fallback — they're explicit jumps, not a passive default.
      const openId = searchParams.get("open");
      if (openId && list.some((r) => r.id === openId)) {
        persistSelection(openId);
        return;
      }
      if (searchParams.get("new") === "1") {
        void handleNew();
        router.replace(pathname);
        return;
      }

      if (restoredThisPageLoad.has(basePath)) return;
      restoredThisPageLoad.add(basePath);

      const savedId = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (savedId && list.some((r) => r.id === savedId)) {
        setSelectedId(savedId);
      } else if (list.length > 0) {
        const mostRecent = [...list].sort((a, b) =>
          (b.lastModifiedUtc ?? "").localeCompare(a.lastModifiedUtc ?? "")
        )[0];
        persistSelection(mostRecent.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flush = useRef(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = { title: pending.title, body: pending.body, [dateField]: pending.date } as Partial<T>;
    try {
      if (newIdsRef.current.has(pending.id)) {
        const created = await api.create({ id: pending.id, ...payload } as Partial<T>);
        newIdsRef.current.delete(pending.id);
        setRecords((prev) => prev.map((r) => (r.id === pending.id ? created : r)));
      } else {
        const updated = await api.update(pending.id, payload);
        setRecords((prev) => prev.map((r) => (r.id === pending.id ? updated : r)));
      }
    } catch {
      // Put the edit back so the next flush (or unload beacon) retries it
      pendingRef.current = pending;
    }
  });

  // Best-effort flush on tab close/refresh — fetch with keepalive can outlive
  // the page unload event, unlike a normal in-flight promise.
  useEffect(() => {
    function handleBeforeUnload() {
      const pending = pendingRef.current;
      if (!pending) return;
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5050";
      const token = localStorage.getItem("workpulse.token");
      const isNew = newIdsRef.current.has(pending.id);
      const payload = { title: pending.title, body: pending.body, [dateField]: pending.date } as Record<string, unknown>;
      fetch(isNew ? `${apiBase}${basePath}` : `${apiBase}${basePath}/${pending.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(isNew ? { id: pending.id, ...payload } : payload),
        keepalive: true,
      }).catch(() => {});
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath]);

  // Flush whenever the selection is about to change, and on unmount.
  async function selectRecord(id: string | null) {
    await flush.current();
    persistSelection(id);
  }

  useEffect(() => {
    return () => {
      void flush.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes the open note, Apple Notes-style — autosave still flushes first via selectRecord.
  // While fullscreen, Escape backs out of fullscreen first (matching Gmail's expanded compose),
  // and only closes the note on a second press.
  useEffect(() => {
    if (!selectedId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      void selectRecord(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, fullscreen]);

  const selected = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId]);

  // Sync title/body/date the instant selectedId changes, DURING render rather than in an effect.
  // RichTextEditor is remounted (via key={selectedId}) in this same render, and reads `body` as
  // its one-time initial value — if the sync happened in an effect instead, it would run one tick
  // too late: the new editor would mount with the previous note's stale content already frozen in
  // and never catch up, since its own mount-sync only fires once.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (selected && loadedId !== selectedId) {
    setLoadedId(selectedId);
    setTitle(selected.title);
    setBody(selected.body);
    setDateValue(String(selected[dateField]));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...records].sort((a, b) => String(b[dateField]).localeCompare(String(a[dateField])));
    if (!q) return sorted;
    return sorted.filter((r) => `${r.title} ${stripHtml(r.body)}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, search]);

  function scheduleSave(nextTitle: string, nextBody: string, nextDate: string) {
    if (!selectedId) return;
    pendingRef.current = { id: selectedId, title: nextTitle, body: nextBody, date: nextDate };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush.current();
    }, 800);
  }

  async function handleNew() {
    await flush.current();
    const draft = { id: crypto.randomUUID(), title: "", body: "", ...makeNew() } as T;
    newIdsRef.current.add(draft.id);
    setRecords((prev) => [draft, ...prev]);
    persistSelection(draft.id);
    setTitle("");
    setBody("");
    setDateValue(String(draft[dateField]));
  }

  async function handleDelete(id: string) {
    if (pendingRef.current?.id === id) {
      pendingRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) persistSelection(null);
    if (!newIdsRef.current.has(id)) {
      await api.delete(id);
    }
    newIdsRef.current.delete(id);
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 md:h-[calc(100vh-4rem)] md:grid-cols-[320px_1fr]">
      {/* Sidebar */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{heading}</h1>
            <p className="text-xs text-muted-foreground">{subheading}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {onExport && (
              <Button
                size="icon"
                variant={selectMode ? "default" : "glass"}
                onClick={toggleSelectMode}
                title={selectMode ? "Cancel selection" : "Select entries to export"}
              >
                {selectMode ? <X className="size-4" /> : <CheckSquare className="size-4" />}
              </Button>
            )}
            <Button size="icon" variant="glass" onClick={handleNew} title={`New ${heading.slice(0, -1)}`}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div className="border-b border-white/10 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading && <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
          {!loading && filtered.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No entries yet — click + to add one.</p>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => (selectMode ? toggleSelected(r.id) : selectRecord(r.id))}
              className={cn(
                "group mb-1 flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                !selectMode && r.id === selectedId ? "bg-primary/15" : "hover:bg-foreground/5"
              )}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelected(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 size-3.5 shrink-0 cursor-pointer"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.title || "Untitled"}</span>
                  {!selectMode && (
                    <Trash2
                      className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(r.id);
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{String(r[dateField])}</span>
                <span className="truncate text-xs text-muted-foreground/70">{stripHtml(r.body) || "No content"}</span>
              </div>
            </button>
          ))}
        </div>
        {selectMode && (
          <div className="flex flex-col gap-2 border-t border-white/10 p-3">
            <div className="flex gap-1">
              <Button
                variant={exportFormat === "xlsx" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setExportFormat("xlsx")}
              >
                XLSX
              </Button>
              <Button
                variant={exportFormat === "html" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setExportFormat("html")}
              >
                HTML
              </Button>
            </div>
            <Button size="sm" onClick={handleExportSelected} disabled={selectedIds.size === 0 || exporting}>
              <Download className="size-3.5" />
              {exporting
                ? "Exporting…"
                : selectedIds.size > 0
                  ? `Export ${selectedIds.size} ${selectedIds.size === 1 ? "entry" : "entries"}`
                  : "Select entries to export"}
            </Button>
          </div>
        )}
      </div>

      {/* Editor */}
      <motion.div
        key={selectedId ?? "empty"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6"
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <Icon className="size-10 opacity-40" />
            <p>Select an entry, or create a new one.</p>
          </div>
        ) : (
          !fullscreen && (
            <EditorFields
              title={title}
              body={body}
              dateValue={dateValue}
              dateLabel={dateLabel}
              selectedId={selectedId}
              fullscreen={fullscreen}
              setTitle={setTitle}
              setBody={setBody}
              setDateValue={setDateValue}
              setFullscreen={setFullscreen}
              scheduleSave={scheduleSave}
              flush={flush}
            />
          )
        )}
      </motion.div>

      {selected &&
        createPortal(
          <AnimatePresence>
            {fullscreen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 flex flex-col bg-background p-6 md:p-10"
              >
                <EditorFields
                  title={title}
                  body={body}
                  dateValue={dateValue}
                  dateLabel={dateLabel}
                  selectedId={selectedId}
                  fullscreen={fullscreen}
                  setTitle={setTitle}
                  setBody={setBody}
                  setDateValue={setDateValue}
                  setFullscreen={setFullscreen}
                  scheduleSave={scheduleSave}
                  flush={flush}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {confirmDeleteId &&
        (() => {
          const target = records.find((r) => r.id === confirmDeleteId);
          return (
            <ConfirmDialog
              title={`Delete this ${heading.slice(0, -1).toLowerCase()}?`}
              description={target?.title ? `“${target.title}” will be permanently removed.` : "This will be permanently removed."}
              confirmLabel="Delete"
              cancelLabel="Cancel"
              onConfirm={() => {
                handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              onCancel={() => setConfirmDeleteId(null)}
            />
          );
        })()}
    </div>
  );
}

/** The title/date/fullscreen-toggle row plus the editor itself — rendered either inline in the
 * editor panel or, while `fullscreen`, inside a full-viewport portal. Kept as one component
 * (rather than duplicated JSX) so both places share the exact same fields/handlers. */
function EditorFields({
  title,
  body,
  dateValue,
  dateLabel,
  selectedId,
  fullscreen,
  setTitle,
  setBody,
  setDateValue,
  setFullscreen,
  scheduleSave,
  flush,
}: {
  title: string;
  body: string;
  dateValue: string;
  dateLabel: string;
  selectedId: string | null;
  fullscreen: boolean;
  setTitle: (v: string) => void;
  setBody: (v: string) => void;
  setDateValue: (v: string) => void;
  setFullscreen: (v: boolean) => void;
  scheduleSave: (title: string, body: string, date: string) => void;
  flush: React.RefObject<() => Promise<void>>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(e.target.value, body, dateValue);
          }}
          onBlur={() => flush.current()}
          placeholder="Title"
          className="h-auto flex-1 rounded-none border-none bg-transparent p-0 text-xl font-semibold leading-tight shadow-none focus-visible:rounded-none focus-visible:border-none focus-visible:bg-transparent focus-visible:ring-0"
        />
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => {
              setDateValue(e.target.value);
              scheduleSave(title, body, e.target.value);
            }}
            onBlur={() => flush.current()}
            className="w-40"
          />
          <Button
            size="icon"
            variant="glass"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
      </div>
      <RichTextEditor
        key={selectedId}
        initialValue={body}
        onChange={(html) => {
          setBody(html);
          scheduleSave(title, html, dateValue);
        }}
        onBlur={() => flush.current()}
        placeholder="Start writing…"
        className="p-0"
      />
    </div>
  );
}
