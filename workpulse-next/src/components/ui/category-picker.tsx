"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { reimbursementApi } from "@/lib/api/client";
import type { ReimbursementCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Category dropdown backed by the user's real, reusable category list (ReimbursementCategory) —
 * typing a name that doesn't exist yet shows a "Create ..." option that persists it via the API
 * and selects it immediately. Hovering an existing row also reveals rename/delete controls, so
 * the full CRUD lifecycle (create/read/update/delete) lives in one place rather than a separate
 * management screen. */
export function CategoryPicker({
  value,
  onChange,
  placeholder = "Select category…",
  className,
}: {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [categories, setCategories] = useState<ReimbursementCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reimbursementApi.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  function closeDropdown() {
    setOpen(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setQuery("");
  }

  const trimmedQuery = query.trim();
  const filtered = categories.filter((c) => c.name.toLowerCase().includes(trimmedQuery.toLowerCase()));
  const exactMatch = categories.some((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = trimmedQuery.length > 0 && !exactMatch;

  function select(name: string) {
    onChange(name);
    closeDropdown();
  }

  async function createAndSelect() {
    const name = trimmedQuery;
    if (!name) return;
    const created = await reimbursementApi.createCategory(name);
    setCategories((prev) => [...prev.filter((c) => c.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name)));
    select(created.name);
  }

  function startEdit(c: ReimbursementCategory) {
    setEditingId(c.id);
    setEditingName(c.name);
    setEditError(null);
    setConfirmDeleteId(null);
  }

  async function confirmRename(c: ReimbursementCategory) {
    const name = editingName.trim();
    if (!name) return;
    try {
      const updated = await reimbursementApi.renameCategory(c.id, name);
      setCategories((prev) => prev.map((cat) => (cat.id === c.id ? updated : cat)).sort((a, b) => a.name.localeCompare(b.name)));
      if (value === c.name) onChange(updated.name);
      setEditingId(null);
    } catch {
      setEditError("Name already in use.");
    }
  }

  async function confirmDelete(c: ReimbursementCategory) {
    await reimbursementApi.deleteCategory(c.id);
    setCategories((prev) => prev.filter((cat) => cat.id !== c.id));
    setConfirmDeleteId(null);
    if (value === c.name) onChange("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-full border border-input bg-background/50 px-4 text-sm backdrop-blur-md outline-none"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="glass-panel absolute z-40 mt-1 max-h-64 w-full min-w-[240px] overflow-y-auto p-1.5">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create…"
            className="mb-1.5 w-full rounded-lg bg-foreground/5 px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                void createAndSelect();
              }
            }}
          />
          {filtered.map((c) => {
            if (confirmDeleteId === c.id) {
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-1.5">
                  <span className="truncate text-sm text-destructive">Delete &quot;{c.name}&quot;?</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void confirmDelete(c)}
                      className="cursor-pointer rounded-md bg-destructive px-2 py-0.5 text-xs font-medium text-white"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium hover:bg-foreground/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            if (editingId === c.id) {
              return (
                <div key={c.id} className="flex flex-col gap-1 rounded-lg bg-foreground/5 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void confirmRename(c);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md bg-background/60 px-2 py-1 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void confirmRename(c)}
                      className="cursor-pointer rounded-md p-1 text-primary hover:bg-primary/10"
                      title="Save"
                    >
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-foreground/10"
                      title="Cancel"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {editError && <p className="px-1 text-xs text-destructive">{editError}</p>}
                </div>
              );
            }

            return (
              <div key={c.id} className="group flex w-full items-center rounded-lg hover:bg-foreground/10">
                <button type="button" onClick={() => select(c.name)} className="flex min-w-0 flex-1 cursor-pointer items-center justify-between px-3 py-1.5 text-left text-sm text-foreground">
                  <span className="truncate">{c.name}</span>
                  {value === c.name && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
                <div className="hidden shrink-0 items-center gap-0.5 pr-1.5 group-hover:flex">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(c);
                    }}
                    className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-primary"
                    title="Rename"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(c.id);
                    }}
                    className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !canCreate && (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">No categories yet — type one above to create it.</p>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => void createAndSelect()}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-primary hover:bg-primary/10"
            >
              <Plus className="size-3.5 shrink-0" />
              <span className="truncate">Create &quot;{trimmedQuery}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
