"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Pencil, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { quickLinksApi } from "@/lib/api/client";
import type { QuickLink } from "@/lib/api/types";
import { categoryColor } from "@/lib/category-color";
import { cn } from "@/lib/utils";

function emptyLink(): Partial<QuickLink> {
  return { label: "", url: "", category: "", keywords: "" };
}

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export default function BookmarksPage() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<QuickLink>>(emptyLink());

  useEffect(() => {
    quickLinksApi.getAll().then((list) => {
      setLinks(list);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(links.map((l) => l.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [links]);

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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmark Library</h1>
          <p className="mt-1 text-muted-foreground">Find any saved link by name, synonym, or category</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add Bookmark
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder='Search — try "drive", "wiki", a category…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

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

      {showForm && (
        <Card className="mb-6 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input placeholder="Label (e.g. My Drive)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input placeholder="https://example.com" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input
              placeholder="Category (e.g. Cloud Storage)"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Input
              placeholder="Keywords, comma-separated"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleSave}>{editingId ? "Update" : "Add"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Bookmark className="size-10 opacity-40" />
          <p>No bookmarks match — try Add Bookmark above.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((link) => {
          const accent = categoryColor(link.category);
          return (
            <Card
              key={link.id}
              className="group relative flex h-28 flex-col p-3"
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 8%, var(--card))`,
                borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
              }}
            >
              <a href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="absolute inset-0" />
              {link.category && (
                <span
                  className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                >
                  {link.category}
                </span>
              )}
              <span className="mt-2 line-clamp-2 text-sm font-semibold">{link.label}</span>
              <span className="mt-auto truncate text-xs text-muted-foreground">{link.url}</span>
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
