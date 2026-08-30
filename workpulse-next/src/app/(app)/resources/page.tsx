"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
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
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/ui/tag-input";
import { SearchInput } from "@/components/ui/search-input";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { DetailRow } from "@/components/ui/detail-row";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resourcesApi, downloadBlob, ApiError } from "@/lib/api/client";
import type { Resource, ResourceType } from "@/lib/api/types";
import { accentCardStyle } from "@/lib/category-color";
import { recordView } from "@/lib/recently-viewed";
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
  return { type: "Link" as ResourceType, title: "", notes: "", url: "", tags: [] as string[], keywords: "", files: [] as File[] };
}

// Executable/script types only — a personal knowledge library has no reason to run anything it
// stores, and blocking these avoids accidentally hosting something that could execute if
// downloaded and opened later. Documents, images, archives, media, and everything else typical
// of "notes and reference material" are unrestricted.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "msp", "scr", "vbs", "vbe", "js", "jse", "wsf", "wsh",
  "ps1", "psm1", "sh", "bash", "app", "dmg", "pkg", "apk", "jar", "action", "command", "workflow",
]);

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

function isBlockedFile(file: File): boolean {
  return BLOCKED_EXTENSIONS.has(fileExtension(file.name));
}

/** A file's own name, minus its extension, used as the per-resource title when several files are
 * uploaded at once — each becomes its own Resource, identified by its filename rather than one
 * shared title none of them individually matches. */
function titleFromFileName(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx > 0 ? name.slice(0, idx) : name;
}

type UploadStatus = "queued" | "uploading" | "done" | "error";
interface UploadEntry {
  id: string;
  file: File;
  status: UploadStatus;
  error?: string;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [selectedTag, setSelectedTag] = useState("All");

  const [showForm, setShowForm] = useState(() => searchParams.get("new") === "1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<Resource | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Per-file upload tracking for the multi-file "New Resource" flow — each selected file becomes
  // its own entry here (queued → uploading → done/error) so the modal can show a macOS-style
  // per-item progress list instead of one opaque "saving…" spinner for the whole batch.
  const [uploads, setUploads] = useState<UploadEntry[]>([]);

  useEffect(() => {
    resourcesApi.getAll().then((list) => {
      setResources(list);
      setLoading(false);
      // Lets Spotlight jump straight to a specific resource's detail view (`?open=<id>`), same
      // idea as `?new=1` opening the add form — needs the list loaded first since detail is
      // looked up by id.
      const openId = searchParams.get("open");
      if (openId) {
        const match = list.find((r) => r.id === openId);
        if (match) setDetail(match);
      }
    });
  }, [searchParams]);

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
    setUploads([]);
    setShowForm(true);
  }

  function openEdit(r: Resource) {
    setEditingId(r.id);
    setForm({ type: r.type, title: r.title, notes: r.notes, url: r.url ?? "", tags: parseTags(r.tags), keywords: r.keywords, files: [] });
    setSaveError(null);
    setUploads([]);
    setShowForm(true);
    setDetail(null);
  }

  function addFiles(newFiles: File[]) {
    const accepted = newFiles.filter((f) => !isBlockedFile(f));
    const rejected = newFiles.length - accepted.length;
    setForm((prev) => ({ ...prev, files: [...prev.files, ...accepted] }));
    setUploads((prev) => [
      ...prev,
      ...accepted.map((file, i) => ({ id: `${file.name}-${file.size}-${prev.length + i}`, file, status: "queued" as UploadStatus })),
    ]);
    setSaveError(rejected > 0 ? `${rejected} file${rejected === 1 ? "" : "s"} skipped — that file type isn't allowed.` : null);
  }

  function removeUpload(id: string) {
    setUploads((prev) => {
      const target = prev.find((u) => u.id === id);
      if (target) setForm((f) => ({ ...f, files: f.files.filter((file) => file !== target.file) }));
      return prev.filter((u) => u.id !== id);
    });
  }

  const canSubmit =
    form.type === "File"
      ? editingId !== null || form.files.length > 0
      : form.title.trim().length > 0 && (form.type !== "Link" || form.url.trim().length > 0);

  async function handleSave() {
    if (!canSubmit || saving) return;
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
        setShowForm(false);
      } else if (form.type === "File") {
        // Sequential, not parallel — keeps the per-file "queued → uploading → done" progression
        // honest (an accurate reflection of what's actually happening right now) rather than
        // firing every request at once and guessing at individual completion order.
        const created: Resource[] = [];
        let anyFailed = false;
        for (const entry of uploads) {
          if (entry.status === "done") continue;
          setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: "uploading" } : u)));
          try {
            const resource = await resourcesApi.create({
              type: "File",
              title: uploads.length > 1 || !form.title.trim() ? titleFromFileName(entry.file.name) : form.title,
              notes: form.notes,
              tags: form.tags.join(", "),
              keywords: form.keywords,
              file: entry.file,
            });
            created.push(resource);
            setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: "done" } : u)));
          } catch (err) {
            anyFailed = true;
            const message = err instanceof ApiError ? err.message : "Upload failed.";
            setUploads((prev) => prev.map((u) => (u.id === entry.id ? { ...u, status: "error", error: message } : u)));
          }
        }
        if (created.length > 0) setResources((prev) => [...created, ...prev]);
        if (!anyFailed) {
          setShowForm(false);
        } else {
          setSaveError("Some files failed to upload — remove them or try again.");
        }
      } else {
        const created = await resourcesApi.create({
          type: form.type,
          title: form.title,
          notes: form.notes,
          url: form.type === "Link" ? form.url : undefined,
          tags: form.tags.join(", "),
          keywords: form.keywords,
        });
        setResources((prev) => [created, ...prev]);
        setShowForm(false);
      }
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

      <SearchInput placeholder='Search — try "taiwan", "visa", a tag…' value={search} onValueChange={setSearch} className="mb-4 max-w-md" />

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

      <FormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Resource" : "New Resource"}
        maxWidthClassName={form.type === "File" && !editingId ? "max-w-2xl" : "max-w-lg"}
        onSubmit={handleSave}
      >
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
            {!(form.type === "File" && !editingId) && (
              <Input
                placeholder="Title (e.g. Taiwan Visa Guide)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="sm:col-span-2"
              />
            )}
            {form.type === "Link" && (
              <Input
                placeholder="https://example.com"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="sm:col-span-2"
              />
            )}
            {form.type === "File" && !editingId && (
              <div className="sm:col-span-2">
                {/* Optional — only matters when exactly one file is queued (a shared title across
                    several files wouldn't uniquely identify any of them, so multi-file mode always
                    titles each resource from its own filename instead). */}
                {uploads.length <= 1 && (
                  <Input
                    placeholder="Title (defaults to the file name)"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="mb-3"
                  />
                )}
                <FileDropZone
                  multiple
                  onFiles={addFiles}
                  className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-input bg-background/50 px-4 text-center text-sm text-muted-foreground backdrop-blur-md hover:bg-foreground/5"
                >
                  <Upload className="size-5 shrink-0" />
                  <span>
                    <span className="font-medium text-foreground">Click to upload</span> or drag and drop — any number of files
                  </span>
                  <span className="text-xs">PDF, Word, Excel, image, archive, or anything except an executable</span>
                </FileDropZone>

                {uploads.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    {uploads.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{u.file.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatSize(u.file.size)}
                            {u.status === "error" && u.error ? ` — ${u.error}` : ""}
                          </p>
                        </div>
                        {u.status === "uploading" && <Spinner size={16} className="shrink-0 text-primary" />}
                        {u.status === "done" && <CheckCircle2 className="size-4 shrink-0 text-[#34C759]" />}
                        {u.status === "error" && <AlertCircle className="size-4 shrink-0 text-destructive" />}
                        {(u.status === "queued" || u.status === "error") && (
                          <button
                            type="button"
                            onClick={() => removeUpload(u.id)}
                            className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                            title="Remove"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? <Spinner size={16} /> : editingId ? "Update" : "Add"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
      </FormModal>

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
              style={{ ...accentCardStyle(meta.color), borderLeftColor: meta.color }}
              onClick={() => {
                setDetail(r);
                recordView({ type: "resource", id: r.id, label: r.title, description: meta.label, href: "/resources" });
              }}
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
              className={cn("flex w-full flex-col", detail.type === "Note" ? "max-h-[80vh] max-w-lg" : "max-w-md")}
            >
              <Card className="flex min-h-0 flex-1 flex-col p-6">
                <div className="mb-4 flex shrink-0 items-start justify-between">
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
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                  {detail.type === "Link" && detail.url && (
                    <DetailRow icon={Link2} label="URL" value={normalizeUrl(detail.url)} href={normalizeUrl(detail.url)} copyable />
                  )}
                  {detail.type === "File" && <DetailRow icon={FileText} label="File" value={`${detail.fileName} (${formatSize(detail.sizeBytes)})`} />}
                  {/* Notes on a Note-type resource is the actual body, not a caption — render it
                      like Apple Notes (full text, wrapped, scrollable) instead of the single-line
                      truncated DetailRow every other field uses. */}
                  {detail.type === "Note" ? (
                    detail.notes && (
                      <div className="flex min-h-0 flex-1 flex-col gap-1">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Text className="size-3.5" /> Notes
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.notes}</p>
                      </div>
                    )
                  ) : (
                    <DetailRow icon={Text} label="Notes" value={detail.notes} />
                  )}
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
