"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Link2, Search, StickyNote, X } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { resourcesApi } from "@/lib/api/client";
import type { Resource } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TYPE_ICON = { Link: Link2, File: FileText, Note: StickyNote } as const;

/** Search-and-pick dialog over the user's own Resources — used by both Business Trips and
 * Reimbursement to link a document to a saved guide/note (the same underlying field on
 * TripDocumentEntity, surfaced identically from both pages since it's the same document either
 * way). Fetches the full list once and filters client-side, mirroring how the Resources page
 * itself searches — the list is small enough per user that a dedicated search endpoint isn't
 * warranted. */
export function ResourcePickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (resource: Resource) => void;
}) {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open && resources === null) resourcesApi.getAll().then(setResources).catch(() => setResources([]));
  }, [open, resources]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = resources ?? [];
    if (!q) return list;
    return list.filter((r) => `${r.title} ${r.notes} ${r.tags} ${r.keywords}`.toLowerCase().includes(q));
  }, [resources, query]);

  return (
    <FormModal open={open} onClose={onClose} title="Link to a Resource">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your Resources…"
          className="h-9 w-full rounded-full border border-input bg-background/50 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
        {resources === null && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {resources !== null && filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matching resources.</p>
        )}
        {filtered.map((r) => {
          const Icon = TYPE_ICON[r.type];
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelect(r);
                onClose();
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-foreground/5"
              )}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.title}</span>
                {(r.tags || r.notes) && <span className="block truncate text-xs text-muted-foreground">{r.tags || r.notes}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </FormModal>
  );
}

/** Small chip shown on a document once it's linked to a Resource — click to jump to it in
 * Resources, with a remove (X) button to unlink. */
export function ResourceLinkChip({
  resource,
  onRemove,
}: {
  resource: Pick<Resource, "id" | "title">;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2 pr-1 text-xs font-medium text-primary">
      <a href={`/resources?q=${encodeURIComponent(resource.title)}`} className="truncate hover:underline">
        {resource.title}
      </a>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="cursor-pointer rounded-full p-0.5 hover:bg-primary/15"
        title="Unlink"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
