"use client";

import { useEffect, useState } from "react";
import { Globe, Link2, Lock, Plus, X } from "lucide-react";
import { FormModal } from "@/components/ui/form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { shareApi, ApiError } from "@/lib/api/client";
import type { ShareableResourceType, ShareConfig, ShareGrant, SharePermission } from "@/lib/api/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyConfig(resourceType: ShareableResourceType, resourceId: string): ShareConfig {
  return { resourceType, resourceId, isPublic: false, publicPermission: "Read", grants: [] };
}

/** Drive-style share sheet — one component reused for every shareable item (Trips, Reimbursement
 * documents, Daily/Weekly Reports, Contacts, Bookmarks, Resources). Fetches the item's current
 * share config on open, lets the owner add/remove people by email with a Read/Edit permission
 * each, and toggle a public "anyone with the link" mode with its own permission + copyable URL. */
export function ShareDialog({
  open,
  onClose,
  resourceType,
  resourceId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  resourceType: ShareableResourceType;
  resourceId: string;
  title: string;
}) {
  const [config, setConfig] = useState<ShareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPermission, setNewPermission] = useState<SharePermission>("Read");
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        setConfig(await shareApi.get(resourceType, resourceId));
      } catch {
        setConfig(emptyConfig(resourceType, resourceId));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [open, resourceType, resourceId]);

  async function persist(next: ShareConfig) {
    setConfig(next);
    setSaving(true);
    setError(null);
    try {
      const saved = await shareApi.save({ ...next, notify });
      setConfig(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save sharing settings.");
    } finally {
      setSaving(false);
    }
  }

  function addPerson() {
    if (!config) return;
    const email = newEmail.trim();
    if (!EMAIL_PATTERN.test(email)) return;
    if (config.grants.some((g) => g.email.toLowerCase() === email.toLowerCase())) return;
    const grants: ShareGrant[] = [...config.grants, { email, permission: newPermission }];
    setNewEmail("");
    void persist({ ...config, grants });
  }

  function removePerson(email: string) {
    if (!config) return;
    void persist({ ...config, grants: config.grants.filter((g) => g.email !== email) });
  }

  function updatePermission(email: string, permission: SharePermission) {
    if (!config) return;
    void persist({ ...config, grants: config.grants.map((g) => (g.email === email ? { ...g, permission } : g)) });
  }

  function togglePublic() {
    if (!config) return;
    void persist({ ...config, isPublic: !config.isPublic });
  }

  function updatePublicPermission(permission: SharePermission) {
    if (!config) return;
    void persist({ ...config, publicPermission: permission });
  }

  // /s/ rather than /shared/ — the authenticated app already owns /shared (the "Shared with Me"
  // list) and /shared/[shareId] (its per-item viewer), so the public link needs its own path.
  const publicUrl = config?.publicToken ? `${window.location.origin}/s/${config.publicToken}` : null;

  return (
    <FormModal open={open} onClose={onClose} title={`Share “${title}”`}>
      {loading || !config ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner size={16} /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">People with access</p>
            <div className="flex gap-1.5">
              <Input
                type="email"
                placeholder="Add people by email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPerson();
                  }
                }}
                className="flex-1"
              />
              <select
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value as SharePermission)}
                className="h-10 rounded-full border border-input bg-background/50 px-3 text-sm backdrop-blur-md outline-none"
              >
                <option value="Read">Read</option>
                <option value="Edit">Edit</option>
              </select>
              <Button type="button" size="icon" onClick={addPerson} disabled={!EMAIL_PATTERN.test(newEmail.trim())}>
                <Plus className="size-4" />
              </Button>
            </div>

            <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="size-3.5 cursor-pointer rounded border-input"
              />
              Notify people by email
            </label>

            {config.grants.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {config.grants.map((g) => (
                  <div key={g.email} className="flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{g.email}</span>
                    <select
                      value={g.permission}
                      onChange={(e) => updatePermission(g.email, e.target.value as SharePermission)}
                      className="h-7 rounded-full border border-input bg-background/50 px-2 text-xs outline-none"
                    >
                      <option value="Read">Read</option>
                      <option value="Edit">Edit</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removePerson(g.email)}
                      className="cursor-pointer rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">General access</p>
            <button
              type="button"
              onClick={togglePublic}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2.5 text-left hover:bg-foreground/5"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/8">
                {config.isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{config.isPublic ? "Anyone with the link" : "Private"}</span>
                <span className="block text-xs text-muted-foreground">
                  {config.isPublic ? "No sign-in required" : "Only people added above can access it"}
                </span>
              </span>
            </button>

            {config.isPublic && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Can</span>
                  <select
                    value={config.publicPermission}
                    onChange={(e) => updatePublicPermission(e.target.value as SharePermission)}
                    className="h-7 rounded-full border border-input bg-background/50 px-2 text-xs outline-none"
                  >
                    <option value="Read">view</option>
                    <option value="Edit">edit</option>
                  </select>
                </div>
                {publicUrl && (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.03] px-3 py-2">
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{publicUrl}</span>
                    <CopyButton value={publicUrl} />
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between border-t border-border pt-4">
            {saving ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner size={12} /> Saving…
              </p>
            ) : (
              <span />
            )}
            {/* Every change above already saves itself the moment it happens (add/remove a
                person, toggle public, change a permission) — this doesn't trigger a save, it's
                just the explicit "I'm done" close, same as Drive's own Share sheet. */}
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </FormModal>
  );
}
