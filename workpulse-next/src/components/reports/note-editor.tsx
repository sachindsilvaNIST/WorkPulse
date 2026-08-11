"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface NoteRecord {
  id: string;
  title: string;
  body: string;
  lastModifiedUtc?: string;
}

interface NoteApi<T extends NoteRecord> {
  getAll: () => Promise<T[]>;
  create: (record: Partial<T>) => Promise<T>;
  update: (id: string, record: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

/**
 * Apple Notes-style sidebar-list + inline-editor, with silent background
 * autosave (no Save button, no visible status text) — same UX as the
 * desktop/Blazor report editors.
 */
export function NoteEditor<T extends NoteRecord>({
  icon: Icon,
  heading,
  subheading,
  dateField,
  dateLabel,
  api,
  makeNew,
}: {
  icon: LucideIcon;
  heading: string;
  subheading: string;
  dateField: keyof T;
  dateLabel: string;
  api: NoteApi<T>;
  makeNew: () => Partial<T>;
}) {
  const [records, setRecords] = useState<T[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dateValue, setDateValue] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNewDraft = useRef(false);

  useEffect(() => {
    api.getAll().then((list) => {
      setRecords(list);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => records.find((r) => r.id === selectedId) ?? null, [records, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setBody(selected.body);
    setDateValue(String(selected[dateField]));
    isNewDraft.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...records].sort((a, b) => String(b[dateField]).localeCompare(String(a[dateField])));
    if (!q) return sorted;
    return sorted.filter((r) => `${r.title} ${r.body}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, search]);

  function scheduleSave(nextTitle: string, nextBody: string, nextDate: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!selectedId) return;
      const payload = { title: nextTitle, body: nextBody, [dateField]: nextDate } as Partial<T>;
      if (isNewDraft.current) {
        const created = await api.create({ id: selectedId, ...payload } as Partial<T>);
        isNewDraft.current = false;
        setRecords((prev) => prev.map((r) => (r.id === selectedId ? created : r)));
      } else {
        const updated = await api.update(selectedId, payload);
        setRecords((prev) => prev.map((r) => (r.id === selectedId ? updated : r)));
      }
    }, 800);
  }

  function handleNew() {
    const draft = { id: crypto.randomUUID(), title: "", body: "", ...makeNew() } as T;
    isNewDraft.current = true;
    setRecords((prev) => [draft, ...prev]);
    setSelectedId(draft.id);
    setTitle("");
    setBody("");
    setDateValue(String(draft[dateField]));
  }

  async function handleDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (!isNewDraft.current) await api.delete(id);
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
          <Button size="icon" variant="glass" onClick={handleNew} title={`New ${heading.slice(0, -1)}`}>
            <Plus className="size-4" />
          </Button>
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
          {loading && <p className="p-3 text-sm text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No entries yet — click + to add one.</p>
          )}
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={cn(
                "group mb-1 flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                r.id === selectedId ? "bg-primary/15" : "hover:bg-foreground/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{r.title || "Untitled"}</span>
                <Trash2
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{String(r[dateField])}</span>
              <span className="truncate text-xs text-muted-foreground/70">{r.body || "No content"}</span>
            </button>
          ))}
        </div>
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
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  scheduleSave(e.target.value, body, dateValue);
                }}
                placeholder="Title"
                className="flex-1 border-none bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
                <Input
                  type="date"
                  value={dateValue}
                  onChange={(e) => {
                    setDateValue(e.target.value);
                    scheduleSave(title, body, e.target.value);
                  }}
                  className="w-40"
                />
              </div>
            </div>
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                scheduleSave(title, e.target.value, dateValue);
              }}
              placeholder="Start writing…"
              className="flex-1 resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
