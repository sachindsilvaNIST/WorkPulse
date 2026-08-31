"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { dictionaryApi } from "@/lib/api/client";
import type { DictEntryDto } from "@/lib/api/types";
import { Spinner } from "@/components/ui/spinner";

function emptyEntry(): Partial<DictEntryDto> {
  return { japanese: "", reading: "", meaning: "", exampleJp: "", exampleEn: "", notes: "", jlptLevel: "" };
}

export default function DictionaryPage() {
  const [entries, setEntries] = useState<DictEntryDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<DictEntryDto>>(emptyEntry());

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      dictionaryApi.getEntries(search || undefined).then((list) => {
        setEntries(list);
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.lastModifiedUtc.localeCompare(a.lastModifiedUtc)),
    [entries]
  );

  async function handleSave() {
    if (!form.japanese || !form.meaning) return;
    const created = await dictionaryApi.create(form);
    setEntries((prev) => [created, ...prev]);
    setShowForm(false);
    setForm(emptyEntry());
  }

  async function handleDelete(id: number) {
    await dictionaryApi.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">JP Dictionary</h1>
          <p className="mt-1 text-muted-foreground">Store and search Japanese words and phrases</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> Add Entry
        </Button>
      </div>

      <SearchInput placeholder="Search…" value={search} onValueChange={setSearch} className="mb-6 max-w-md" />

      {showForm && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input placeholder="Japanese" value={form.japanese} onChange={(e) => setForm({ ...form, japanese: e.target.value })} />
            <Input placeholder="Reading (furigana)" value={form.reading ?? ""} onChange={(e) => setForm({ ...form, reading: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Meaning" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
            <Input placeholder="Example (JP)" value={form.exampleJp ?? ""} onChange={(e) => setForm({ ...form, exampleJp: e.target.value })} />
            <Input placeholder="Example (EN)" value={form.exampleEn ?? ""} onChange={(e) => setForm({ ...form, exampleEn: e.target.value })} />
            <Input placeholder="JLPT Level (e.g. N3)" value={form.jlptLevel ?? ""} onChange={(e) => setForm({ ...form, jlptLevel: e.target.value })} />
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
      {!loading && sorted.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <BookOpen className="size-10 opacity-40" />
          <p>No entries yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{e.japanese}</span>
                  {e.reading && <span className="text-sm text-muted-foreground">{e.reading}</span>}
                  {e.jlptLevel && <Badge variant="secondary">{e.jlptLevel}</Badge>}
                </div>
                <p className="mt-1 text-sm">{e.meaning}</p>
                {e.exampleJp && <p className="mt-2 text-xs text-muted-foreground">{e.exampleJp}</p>}
                {e.exampleEn && <p className="text-xs text-muted-foreground/70">{e.exampleEn}</p>}
              </div>
              <DeleteIconButton
                onDelete={() => handleDelete(e.id)}
                title="Delete this entry?"
                description={`“${e.japanese}” will be permanently removed.`}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
