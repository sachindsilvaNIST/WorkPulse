"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  FileText,
  Library,
  Link2,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Tag,
  Text,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { DetailRow } from "@/components/ui/detail-row";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resourcesApi, downloadBlob, ApiError } from "@/lib/api/client";
import type { Resource, ResourceType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TYPE_META: Record<ResourceType, { label: string; icon: typeof Link2; color: string }> = {
  Link: { label: "Link", icon: Link2, color: "#0078D4" },
  File: { label: "File", icon: FileText, color: "#8B5CF6" },
  Note: { label: "Note", icon: StickyNote, color: "#FF9500" },
};

function parseTags(csv: string): string[] {
  return csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function emptyForm() {
  return { type: "Link" as ResourceType, title: "", notes: "", url: "", tags: [] as string[], keywords: "", file: null as File | null };
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [selectedTag, setSelectedTag] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Resource | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    resourcesApi.getAll().then((list) => {
      setResources(list);
      setLoading(false);
    });
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) for (const t of parseTags(r.tags)) set.add(t);
    return Array.from(set).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    let list = resources;
    if (selectedTag !== "All") list = list.filter((r) => parseTags(r.tags).includes(selectedTag));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.title} ${r.notes} ${r.tags} ${r.keywords} ${r.url ?? ""} ${r.fileName}`.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.lastModifiedUtc.localeCompare(a.lastModifiedUtc));
  }, [resources, search, selectedTag]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError(null);
    setShowForm(true);
  }

  function openEdit(r: Resource) {
    setEditingId(r.id);
    setForm({ type: r.type, title: r.title, notes: r.notes, url: r.url ?? "", tags: parseTags(r.tags), keywords: r.keywords, file: null });
    setSaveError(null);
    setShowForm(true);
    setDetail(null);
  }

  const canSubmit = form.title.trim().length > 0 && (form.type !== "Link" || form.url.trim().length > 0) && (editingId || form.type !== "File" || !!form.file);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      if (editingId) {
        const updated = await resourcesApi.update(editingId, {
          title: form.title,
          notes: form.notes,
          url: form.type === "Link" ? form.url : undefined,
          tags: form.tags.join(", "),
          keywords: form.keywords,
        });
        setResources((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      } else {
        const created = await resourcesApi.create({
          type: form.type,
          title: form.title,
          notes: form.notes,
          url: form.type === "Link" ? form.url : undefined,
          tags: form.tags.join(", "),
          keywords: form.keywords,
          file: form.file,
        });
        setResources((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await resourcesApi.delete(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
    setDetail(null);
  }

  async function handleDownload(r: Resource) {
    const { blob, fileName } = await resourcesApi.download(r.id);
    downloadBlob(blob, fileName || r.fileName);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-1 text-muted-foreground">Every saved guide, link, and file — found by keyword</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add Resource
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder='Search — try "taiwan", "visa", a tag…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", ...allTags].map((t) => {
            const active = t === selectedTag;
            return (
              <button
                key={t}
                onClick={() => setSelectedTag(t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  active ? "border-primary/40 bg-primary/12 text-primary" : "border-border bg-background/50 text-muted-foreground hover:bg-foreground/5"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex gap-1.5">
            {(Object.keys(TYPE_META) as ResourceType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!!editingId}
                  onClick={() => setForm({ ...form, type: t })}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    form.type === t ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-foreground/5"
                  )}
                  style={form.type === t ? { backgroundColor: meta.color } : undefined}
                >
                  <Icon className="size-3.5" /> {meta.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Title (e.g. Taiwan Visa Guide)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="sm:col-span-2"
            />
            {form.type === "Link" && (
              <Input
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="sm:col-span-2"
              />
            )}
            {form.type === "File" && !editingId && (
              <FileDropZone
                onFile={(file) => setForm({ ...form, file })}
                className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-full border border-dashed border-input bg-background/50 px-4 text-sm text-muted-foreground backdrop-blur-md hover:bg-foreground/5 sm:col-span-2"
              >
                <Upload className="size-4 shrink-0" />
                <span className="truncate">{form.file ? form.file.name : "PDF, Word, Excel, image, or drop it here…"}</span>
              </FileDropZone>
            )}
            <textarea
              placeholder="Notes — what this is, what worked, anything future-you should know"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-2xl border border-input bg-background/50 px-4 py-2.5 text-sm outline-none backdrop-blur-md placeholder:text-muted-foreground sm:col-span-2"
            />
            <TagInput value={form.tags} onValueChange={(tags) => setForm({ ...form, tags })} suggestions={allTags} placeholder="Tags — press Enter to add" />
            <Input
              placeholder="Keywords, comma-separated (extra search terms)"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </div>

          {saveError && <p className="mt-2 text-sm text-destructive">{saveError}</p>}

          <div className="mt-3 flex gap-2">
            <Button onClick={handleSave} disabled={!canSubmit || saving}>
              {saving ? <Spinner size={16} /> : editingId ? "Update" : "Add"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Library className="size-10 opacity-40" />
          <p>No resources match — try Add Resource above.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const meta = TYPE_META[r.type];
          const Icon = meta.icon;
          const tags = parseTags(r.tags);
          return (
            <Card
              key={r.id}
              className="group relative flex min-h-32 cursor-pointer flex-col overflow-hidden border-l-4 p-3 pb-3.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${meta.color} 8%, var(--card))`,
                borderColor: `color-mix(in srgb, ${meta.color} 25%, transparent)`,
                borderLeftColor: meta.color,
              }}
              onClick={() => setDetail(r)}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  <Icon className="size-3" /> {meta.label}
                </span>
                <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                  <button
                    className="relative z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(r);
                    }}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    className="relative z-10 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(r.id);
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
              <span className="mt-2 line-clamp-2 text-sm font-semibold">{r.title}</span>
              {r.notes && <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.notes}</span>}
              {tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1 pt-2">
                  {tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

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
                    <h2 className="text-xl font-semibold">{detail.title}</h2>
                    <span
                      className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: TYPE_META[detail.type].color }}
                    >
                      {TYPE_META[detail.type].label}
                    </span>
                  </div>
                  <button onClick={() => setDetail(null)} className="rounded-full p-1 hover:bg-foreground/5">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {detail.type === "Link" && detail.url && (
                    <DetailRow icon={Link2} label="URL" value={normalizeUrl(detail.url)} href={normalizeUrl(detail.url)} copyable />
                  )}
                  {detail.type === "File" && <DetailRow icon={FileText} label="File" value={`${detail.fileName} (${formatSize(detail.sizeBytes)})`} />}
                  <DetailRow icon={Text} label="Notes" value={detail.notes} />
                  <DetailRow icon={Tag} label="Tags" value={detail.tags} />
                  <DetailRow icon={Search} label="Keywords" value={detail.keywords} />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  {detail.type === "Link" && detail.url && (
                    <Button asChild>
                      <a href={normalizeUrl(detail.url)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" /> Open Link
                      </a>
                    </Button>
                  )}
                  {detail.type === "File" && (
                    <Button onClick={() => handleDownload(detail)}>
                      <Download className="size-4" /> Download
                    </Button>
                  )}
                  {detail.type === "File" && detail.driveWebViewLink && (
                    <Button variant="outline" asChild>
                      <a href={detail.driveWebViewLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-4" /> Open in Drive
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => openEdit(detail)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button variant="destructive" onClick={() => setConfirmDeleteId(detail.id)}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this resource?"
          description="This can't be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
