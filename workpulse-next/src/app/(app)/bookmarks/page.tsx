"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Bookmark,
  CheckSquare,
  Download,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Tag,
  Text,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Card } from "@/components/ui/card";
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { CategoryPicker } from "@/components/ui/category-picker";
import { quickLinksApi } from "@/lib/api/client";
import type { QuickLink } from "@/lib/api/types";
import { accentCardStyle, categoryColor } from "@/lib/category-color";
import { recordView } from "@/lib/recently-viewed";
import { exportNetscapeBookmarks, parseNetscapeBookmarks } from "@/lib/bookmark-import";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

function emptyLink(): Partial<QuickLink> {
  return { label: "", url: "", category: "", keywords: "" };
}

/** Distinct, non-empty previously entered values for one bookmark field, newest first. */
function fieldHistory(links: QuickLink[], field: keyof QuickLink): string[] {
  const seen = new Set<string>();
  for (let i = links.length - 1; i >= 0; i--) {
    const v = (links[i][field] as string | undefined)?.trim();
    if (v) seen.add(v);
  }
  return Array.from(seen);
}

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function normalizeForCompare(url: string) {
  return url.trim().replace(/\/$/, "").toLowerCase();
}

export default function BookmarksPage() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(() => searchParams.get("new") === "1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<QuickLink>>(emptyLink());
  const [detail, setDetail] = useState<QuickLink | null>(null);

  // Bulk-select mode — a "Select" toggle switches the card grid into checkbox mode for
  // export/delete/recategorize on several bookmarks at once, same Set<string> pattern used
  // elsewhere in the app (admin's feature toggles, the Settings export pickers).
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);
  const [recategorizeValue, setRecategorizeValue] = useState("");

  // Broken-link check — ephemeral (not persisted), just a session-local map of the last check's
  // results, shown as a warning badge on affected cards until the next check or page reload.
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [checkingLinks, setCheckingLinks] = useState(false);

  useEffect(() => {
    quickLinksApi.getAll().then((list) => {
      setLinks(list);
      setLoading(false);
    });
  }, []);

  // Spotlight's "Add Bookmark" action navigates to /bookmarks?new=1 — when already on this page,
  // that's a same-route navigation (query string only), so the component doesn't remount and the
  // `showForm` useState initializer above (which only runs once, on first mount) never sees the
  // param. This effect re-checks it on every searchParams change instead, and strips the param
  // from the URL right after so it doesn't reopen the modal again on a later back/forward nav.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openNew();
      router.replace("/bookmarks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const categories = useMemo(() => {
    const set = new Set(links.map((l) => l.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [links]);

  const labelHistory = useMemo(() => fieldHistory(links, "label"), [links]);
  const urlHistory = useMemo(() => fieldHistory(links, "url"), [links]);
  const categoryHistory = useMemo(() => fieldHistory(links, "category"), [links]);
  const keywordsHistory = useMemo(() => fieldHistory(links, "keywords"), [links]);

  const filtered = useMemo(() => {
    let list = links;
    if (selectedCategory !== "All") list = list.filter((l) => l.category === selectedCategory);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((l) => `${l.label} ${l.url} ${l.category} ${l.keywords}`.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }, [links, search, selectedCategory]);

  function openNew() {
    setEditingId(null);
    setForm(emptyLink());
    setShowForm(true);
  }

  function openEdit(link: QuickLink) {
    setEditingId(link.id);
    setForm(link);
    setShowForm(true);
  }

  // Live duplicate warning while adding — same normalized-URL check already used for import
  // dedup, just surfaced inline instead of silently skipping. Non-blocking: Add still works, this
  // only informs. Doesn't apply while editing an existing bookmark (it'll always "duplicate"
  // itself).
  const duplicateOf = useMemo(() => {
    if (editingId || !form.url) return null;
    const key = normalizeForCompare(form.url);
    return links.find((l) => normalizeForCompare(l.url) === key) ?? null;
  }, [form.url, editingId, links]);

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

  function handleExportSelected() {
    const selected = links.filter((l) => selectedIds.has(l.id));
    const html = exportNetscapeBookmarks(selected);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workpulse-bookmarks-selected.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => quickLinksApi.delete(id)));
    setLinks((prev) => prev.filter((l) => !selectedIds.has(l.id)));
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleRecategorizeSelected() {
    if (!recategorizeValue.trim()) return;
    const ids = Array.from(selectedIds);
    const updated = await Promise.all(
      ids.map((id) => {
        const link = links.find((l) => l.id === id)!;
        return quickLinksApi.update(id, { ...link, category: recategorizeValue.trim() });
      })
    );
    setLinks((prev) => prev.map((l) => updated.find((u) => u.id === l.id) ?? l));
    setRecategorizeOpen(false);
    setRecategorizeValue("");
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleVerifyLinks() {
    const targets = selectMode && selectedIds.size > 0 ? links.filter((l) => selectedIds.has(l.id)) : links;
    if (targets.length === 0) return;
    setCheckingLinks(true);
    try {
      const results = await quickLinksApi.checkLinks(targets.map((l) => l.url));
      setBrokenUrls(new Set(results.filter((r) => !r.ok).map((r) => r.url)));
    } finally {
      setCheckingLinks(false);
    }
  }

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; link: QuickLink } | null>(null);

  function handleCardContextMenu(e: React.MouseEvent, link: QuickLink) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, link });
  }

  useEffect(() => {
    if (!contextMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (!contextMenuRef.current?.contains(e.target as Node)) setContextMenu(null);
    }
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

  async function handleSave() {
    if (!form.label || !form.url) return;
    if (editingId) {
      const updated = await quickLinksApi.update(editingId, form);
      setLinks((prev) => prev.map((l) => (l.id === editingId ? updated : l)));
    } else {
      const created = await quickLinksApi.create(form);
      setLinks((prev) => [...prev, created]);
    }
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await quickLinksApi.delete(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setImporting(true);
    const existingUrls = new Set(links.map((l) => l.url.replace(/\/$/, "").toLowerCase()));
    const perFile: { name: string; added: number }[] = [];
    let totalAdded = 0;

    // Files are imported one at a time (rather than parsed and created in parallel) so the
    // dedupe set stays consistent — two profiles both bookmarking the same URL should only
    // produce one entry, and that only works if each file sees the previous file's additions.
    for (const file of files) {
      const html = await file.text();
      const parsed = parseNetscapeBookmarks(html);
      let added = 0;
      for (const link of parsed) {
        const key = (link.url ?? "").replace(/\/$/, "").toLowerCase();
        if (!key || existingUrls.has(key)) continue;
        existingUrls.add(key);
        const created = await quickLinksApi.create(link);
        setLinks((prev) => [...prev, created]);
        added++;
      }
      perFile.push({ name: file.name, added });
      totalAdded += added;
    }

    setImporting(false);
    if (files.length === 1) {
      setImportMessage(totalAdded > 0 ? `Imported ${totalAdded} bookmark(s).` : "No new bookmarks found — all already imported.");
    } else if (totalAdded > 0) {
      const breakdown = perFile.map((f) => `${f.name}: ${f.added}`).join(", ");
      setImportMessage(`Imported ${totalAdded} bookmark(s) from ${files.length} profiles (${breakdown}).`);
    } else {
      setImportMessage(`No new bookmarks found across ${files.length} profiles — all already imported.`);
    }
    setTimeout(() => setImportMessage(""), 6000);
  }

  function handleExport() {
    const html = exportNetscapeBookmarks(links);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workpulse-bookmarks.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmark Library</h1>
          <p className="mt-1 text-muted-foreground">Find any saved link by name, synonym, or category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={selectMode ? "default" : "outline"} onClick={toggleSelectMode}>
            <CheckSquare className="size-4" /> {selectMode ? "Cancel" : "Select"}
          </Button>
          <Button variant="outline" onClick={handleVerifyLinks} disabled={checkingLinks || links.length === 0}>
            {checkingLinks ? <Spinner size={16} /> : <AlertTriangle className="size-4" />} {checkingLinks ? "Checking…" : "Verify Links"}
          </Button>
          <Button asChild variant="outline" disabled={importing}>
            <label
              className={cn("cursor-pointer", importing && "pointer-events-none opacity-60")}
              title="Select bookmark HTML files from multiple Chrome profiles at once"
            >
              {importing ? <Spinner size={16} /> : <Upload className="size-4" />} {importing ? "Importing…" : "Import from Chrome"}
              <input
                type="file"
                accept=".html,.htm"
                multiple
                className="hidden"
                onChange={handleImportFile}
                disabled={importing}
              />
            </label>
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={links.length === 0}>
            <Download className="size-4" /> Export
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4" /> Add Bookmark
          </Button>
        </div>
      </div>

      {importMessage && <p className="mb-4 text-sm text-muted-foreground">{importMessage}</p>}

      {selectMode && (
        <div className="glass-panel mb-4 flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleExportSelected} disabled={selectedIds.size === 0}>
              <Download className="size-3.5" /> Export Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRecategorizeOpen(true)} disabled={selectedIds.size === 0}>
              <Tag className="size-3.5" /> Recategorize
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={selectedIds.size === 0}>
              <Trash2 className="size-3.5" /> Delete Selected
            </Button>
          </div>
        </div>
      )}

      <SearchInput placeholder='Search — try "drive", "wiki", a category…' value={search} onValueChange={setSearch} className="mb-4 max-w-md" />

      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => {
            const accent = categoryColor(c);
            const active = c === selectedCategory;
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  active && "ring-2 ring-offset-1 ring-offset-background"
                )}
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      )}

      <FormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Bookmark" : "Add Bookmark"}
        onSubmit={handleSave}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AutocompleteInput
            placeholder="Label (e.g. My Drive)"
            value={form.label ?? ""}
            onValueChange={(v) => setForm({ ...form, label: v })}
            suggestions={labelHistory}
          />
          <AutocompleteInput
            placeholder="https://example.com"
            value={form.url ?? ""}
            onValueChange={(v) => setForm({ ...form, url: v })}
            suggestions={urlHistory}
          />
          <AutocompleteInput
            placeholder="Category (e.g. Cloud Storage)"
            value={form.category ?? ""}
            onValueChange={(v) => setForm({ ...form, category: v })}
            suggestions={categoryHistory}
          />
          <AutocompleteInput
            placeholder="Keywords, comma-separated"
            value={form.keywords ?? ""}
            onValueChange={(v) => setForm({ ...form, keywords: v })}
            suggestions={keywordsHistory}
          />
        </div>
        {duplicateOf && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#FF9500]">
            <AlertTriangle className="size-3.5 shrink-0" /> You already have a bookmark for this URL: “{duplicateOf.label}”. Adding anyway is fine if that&apos;s intentional.
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button type="submit">{editingId ? "Update" : "Add"}</Button>
          <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>
      </FormModal>

      <FormModal
        open={recategorizeOpen}
        onClose={() => setRecategorizeOpen(false)}
        title={`Recategorize ${selectedIds.size} Bookmark${selectedIds.size === 1 ? "" : "s"}`}
        onSubmit={handleRecategorizeSelected}
      >
        <CategoryPicker value={recategorizeValue} onChange={setRecategorizeValue} placeholder="New category" />
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={!recategorizeValue.trim()}>
            Apply
          </Button>
          <Button type="button" variant="outline" onClick={() => setRecategorizeOpen(false)}>
            Cancel
          </Button>
        </div>
      </FormModal>

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Bookmark className="size-10 opacity-40" />
          <p>No bookmarks match — try Add Bookmark above.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((link) => {
          const accent = categoryColor(link.category);
          const broken = brokenUrls.has(link.url);
          return (
            <Card
              key={link.id}
              className="group relative flex min-h-28 flex-col p-3 pb-3.5"
              style={accentCardStyle(accent)}
              onContextMenu={(e) => (selectMode ? undefined : handleCardContextMenu(e, link))}
            >
              {selectMode ? (
                <button type="button" className="absolute inset-0" onClick={() => toggleSelected(link.id)} />
              ) : (
                <a
                  href={normalizeUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0"
                  onClick={(e) => {
                    // Cmd-click (Mac) / Ctrl-click (Windows) shows details instead of opening the
                    // link — a plain click still opens it exactly as before. Either way, this is the
                    // bookmark being opened/viewed, so it's the one recordView() call that covers
                    // both branches rather than only the (much rarer) detail-view path.
                    recordView({ type: "bookmark", id: link.id, label: link.label, description: link.category, href: "/bookmarks" });
                    if (e.metaKey || e.ctrlKey) {
                      e.preventDefault();
                      setDetail(link);
                    }
                  }}
                />
              )}
              <div className="flex items-center justify-between gap-1">
                {link.category && (
                  <span
                    className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                  >
                    {link.category}
                  </span>
                )}
                {broken && (
                  <span
                    className="relative z-10 flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                    title="This link didn't respond to a health check"
                  >
                    <AlertTriangle className="size-3" /> Broken
                  </span>
                )}
              </div>
              <span className="mt-2 line-clamp-2 text-sm font-semibold">{link.label}</span>
              <span className="mt-auto truncate text-xs text-muted-foreground">{link.url}</span>
              {selectMode ? (
                <div className="absolute right-2 top-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(link.id)}
                    onChange={() => toggleSelected(link.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 size-4 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
                  <button
                    className="relative z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      openEdit(link);
                    }}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    className="relative z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(link.id);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="glass-panel fixed z-50 min-w-[160px] p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                openEdit(contextMenu.link);
                setContextMenu(null);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10"
            >
              <Pencil className="size-3.5" /> Edit Bookmark
            </button>
            <button
              type="button"
              onClick={() => setContextMenu(null)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>,
          document.body
        )}

      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{detail.label}</h2>
                    {detail.category && <p className="text-sm text-muted-foreground">{detail.category}</p>}
                  </div>
                  <button onClick={() => setDetail(null)} className="rounded-full p-1 hover:bg-foreground/5">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <DetailRow icon={Link2} label="URL" value={normalizeUrl(detail.url)} href={normalizeUrl(detail.url)} copyable />
                  <DetailRow icon={Tag} label="Category" value={detail.category} />
                  <DetailRow icon={Text} label="Keywords" value={detail.keywords} />
                </div>
                <div className="mt-6 flex gap-2">
                  <Button asChild>
                    <a href={normalizeUrl(detail.url)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" /> Open Link
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEdit(detail);
                      setDetail(null);
                    }}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(detail.id);
                      setDetail(null);
                    }}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
