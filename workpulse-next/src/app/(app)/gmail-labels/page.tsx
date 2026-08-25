"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Folder,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gmailApi, ApiError } from "@/lib/api/client";
import type { GmailLabel, GmailStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Stage 2 of the Gmail Label Manager: browse/search/CRUD over the label tree. Message browsing
// (Stage 3) and real-time push sync (Stage 4) land in later passes — see the approved plan.

interface TreeNode {
  segment: string;
  fullPath: string;
  label: GmailLabel | null;
  children: Map<string, TreeNode>;
}

function buildTree(labels: GmailLabel[]): TreeNode {
  const root: TreeNode = { segment: "", fullPath: "", label: null, children: new Map() };
  for (const label of labels) {
    const parts = label.name.split("/");
    let node = root;
    let path = "";
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      let child = node.children.get(part);
      if (!child) {
        child = { segment: part, fullPath: path, label: null, children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    }
    node.label = label;
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => a.segment.localeCompare(b.segment));
}

export default function GmailLabelsPage() {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [labels, setLabels] = useState<GmailLabel[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    gmailApi.status().then(setStatus).catch(() => {});
  }, []);

  async function loadLabels() {
    setLoading(true);
    setError(null);
    try {
      const list = await gmailApi.getLabels();
      setLabels(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load Gmail labels.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status?.connected) void loadLabels();
  }, [status?.connected]);

  const trimmedQuery = query.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!labels || !trimmedQuery) return null;
    return labels.filter((l) => l.name.toLowerCase().includes(trimmedQuery)).sort((a, b) => a.name.localeCompare(b.name));
  }, [labels, trimmedQuery]);

  const tree = useMemo(() => (labels ? buildTree(labels) : null), [labels]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreateError(null);
    try {
      const created = await gmailApi.createLabel(name);
      setLabels((prev) => (prev ? [...prev, created] : [created]));
      setNewName("");
      setCreating(false);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create label.");
    }
  }

  function startEdit(label: GmailLabel) {
    setEditingId(label.id);
    setEditingName(label.name);
    setEditError(null);
    setConfirmDeleteId(null);
  }

  async function confirmRename(label: GmailLabel) {
    const name = editingName.trim();
    if (!name) return;
    try {
      const updated = await gmailApi.renameLabel(label.id, name);
      setLabels((prev) => (prev ? prev.map((l) => (l.id === label.id ? updated : l)) : prev));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Rename failed.");
    }
  }

  async function confirmDelete(label: GmailLabel) {
    await gmailApi.deleteLabel(label.id);
    setLabels((prev) => (prev ? prev.filter((l) => l.id !== label.id) : prev));
    setConfirmDeleteId(null);
  }

  function LabelRow({ label, depth, displayName }: { label: GmailLabel; depth: number; displayName: string }) {
    const isSystem = label.type !== "user";
    const accent = label.color || "#EA4335";

    if (confirmDeleteId === label.id) {
      return (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2" style={{ paddingLeft: 12 + depth * 16 }}>
          <span className="truncate text-sm text-destructive">Delete &quot;{label.name}&quot;?</span>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => void confirmDelete(label)} className="cursor-pointer rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white">
              Delete
            </button>
            <button type="button" onClick={() => setConfirmDeleteId(null)} className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium hover:bg-foreground/10">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (editingId === label.id) {
      return (
        <div className="flex flex-col gap-1 rounded-lg bg-foreground/5 px-3 py-2" style={{ paddingLeft: 12 + depth * 16 }}>
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void confirmRename(label);
                } else if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="min-w-0 flex-1 rounded-md bg-background/60 px-2 py-1 text-sm outline-none"
            />
            <button type="button" onClick={() => void confirmRename(label)} className="cursor-pointer rounded-md p-1 text-primary hover:bg-primary/10" title="Save">
              <Check className="size-3.5" />
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-foreground/10" title="Cancel">
              <X className="size-3.5" />
            </button>
          </div>
          {editError && <p className="px-1 text-xs text-destructive">{editError}</p>}
        </div>
      );
    }

    return (
      <div className="group flex items-center rounded-lg hover:bg-foreground/5" style={{ paddingLeft: 12 + depth * 16 }}>
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-sm">
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <span className="truncate">{displayName}</span>
          {isSystem && <span className="shrink-0 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">system</span>}
        </div>
        {!isSystem && (
          <div className="hidden shrink-0 items-center gap-0.5 pr-2 group-hover:flex">
            <button type="button" onClick={() => startEdit(label)} className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-foreground/10 hover:text-primary" title="Rename">
              <Pencil className="size-3.5" />
            </button>
            <button type="button" onClick={() => setConfirmDeleteId(label.id)} className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  function TreeRows({ node, depth }: { node: TreeNode; depth: number }) {
    const children = sortedChildren(node);
    return (
      <>
        {node.label && <LabelRow label={node.label} depth={depth} displayName={node.segment} />}
        {!node.label && node.fullPath && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground" style={{ paddingLeft: 12 + depth * 16 }}>
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate">{node.segment}</span>
          </div>
        )}
        {children.map((child) => (
          <TreeRows key={child.fullPath} node={child} depth={depth + 1} />
        ))}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gmail Labels</h1>
          <p className="mt-1 text-muted-foreground">Pattern-search and manage your Gmail label tree</p>
        </div>
        {status?.connected && (
          <Button variant="outline" onClick={() => void loadLabels()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} /> {loading ? "Syncing…" : "Sync now"}
          </Button>
        )}
      </div>

      {!status?.connected ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#EA4335]/10 text-[#EA4335]">
              <Mail className="size-6" />
            </div>
            <p className="font-medium">Connect your Gmail account to get started</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Head to Settings to connect the Gmail account whose labels you want to search and manage.
            </p>
            <Button asChild className="mt-2">
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search labels…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-1 py-3">
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {searchMatches ? `${searchMatches.length} match${searchMatches.length === 1 ? "" : "es"}` : "All labels"}
                </h2>
                {!creating ? (
                  <button type="button" onClick={() => setCreating(true)} className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                    <Plus className="size-3.5" /> New label
                  </button>
                ) : null}
              </div>

              {creating && (
                <div className="mb-1 flex flex-col gap-1 rounded-lg bg-foreground/5 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Clients/Acme Corp"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleCreate();
                        } else if (e.key === "Escape") {
                          setCreating(false);
                          setNewName("");
                        }
                      }}
                      className="min-w-0 flex-1 rounded-md bg-background/60 px-2 py-1 text-sm outline-none"
                    />
                    <button type="button" onClick={() => void handleCreate()} className="cursor-pointer rounded-md p-1 text-primary hover:bg-primary/10" title="Create">
                      <Check className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setNewName("");
                        setCreateError(null);
                      }}
                      className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-foreground/10"
                      title="Cancel"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  {createError && <p className="px-1 text-xs text-destructive">{createError}</p>}
                </div>
              )}

              {error && <p className="px-1 py-2 text-sm text-destructive">{error}</p>}
              {!error && loading && !labels && <p className="px-1 py-6 text-center text-sm text-muted-foreground">Loading labels…</p>}
              {!error && labels && labels.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-foreground">No labels found.</p>}

              {searchMatches ? (
                searchMatches.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-muted-foreground">No labels match &quot;{query.trim()}&quot;.</p>
                ) : (
                  searchMatches.map((l) => <LabelRow key={l.id} label={l} depth={0} displayName={l.name} />)
                )
              ) : (
                tree && sortedChildren(tree).map((child) => <TreeRows key={child.fullPath} node={child} depth={0} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
