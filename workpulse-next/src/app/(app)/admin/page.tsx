"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { useShakeAnimation } from "@/hooks/use-shake-animation";
import { EMAIL_PATTERN, isControlKeystroke, isEmailKeystrokeAllowed } from "@/lib/validation";
import { useAuth } from "@/lib/auth-context";
import { adminApi, ApiError } from "@/lib/api/client";
import type { AdminUser } from "@/lib/api/types";
import { Spinner } from "@/components/ui/spinner";

const FEATURE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  dictionary: "JP Dictionary",
  notifications: "Notifications",
  quicklinks: "Bookmarks",
  reports: "Reports",
};

function emptyForm() {
  return { email: "", displayName: "", password: "", isAdmin: false };
}

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const [resetPasswordFor, setResetPasswordFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  const [featuresFor, setFeaturesFor] = useState<AdminUser | null>(null);
  const [featureCatalog, setFeatureCatalog] = useState<string[]>([]);
  const [featureDisabled, setFeatureDisabled] = useState<Set<string>>(new Set());
  const [featuresLoading, setFeaturesLoading] = useState(false);

  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);

  const { controls: emailShakeControls, shake: shakeEmail } = useShakeAnimation();

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/home");
  }, [authLoading, isAdmin, router]);

  function loadUsers() {
    setLoading(true);
    adminApi
      .getUsers()
      .then(setUsers)
      .catch(() => setPageError("Failed to load users."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  if (authLoading || !isAdmin) return null;

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(user: AdminUser) {
    setEditingId(user.id);
    setForm({ email: user.email, displayName: user.displayName, password: "", isAdmin: user.isAdmin });
    setFormError(null);
    setShowForm(true);
  }

  const emailValid = form.email.trim() === "" || EMAIL_PATTERN.test(form.email.trim());

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isControlKeystroke(e)) return;
    if (!isEmailKeystrokeAllowed(e.key, form.email)) {
      e.preventDefault();
      shakeEmail();
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!form.displayName.trim()) {
      setFormError("Display name is required.");
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      shakeEmail();
      setFormError("Enter a valid email address.");
      return;
    }
    if (!editingId && form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (editingId) {
        await adminApi.updateUser(editingId, { email: form.email.trim(), displayName: form.displayName.trim(), isAdmin: form.isAdmin });
      } else {
        await adminApi.createUser({
          email: form.email.trim(),
          displayName: form.displayName.trim(),
          password: form.password,
          isAdmin: form.isAdmin,
        });
      }
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to delete user.");
    }
  }

  async function confirmToggleDisable() {
    if (!disableTarget) return;
    const target = disableTarget;
    setDisableTarget(null);
    try {
      const { isDisabled } = await adminApi.toggleDisable(target.id);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isDisabled } : u)));
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to update user status.");
    }
  }

  async function handleReEnable(user: AdminUser) {
    try {
      const { isDisabled } = await adminApi.toggleDisable(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isDisabled } : u)));
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : "Failed to update user status.");
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordFor) return;
    setResetError(null);
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    try {
      await adminApi.resetPassword(resetPasswordFor.id, newPassword);
      setResetPasswordFor(null);
      setNewPassword("");
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Failed to reset password.");
    }
  }

  async function openFeatures(user: AdminUser) {
    setFeaturesFor(user);
    setFeaturesLoading(true);
    try {
      const data = await adminApi.getUserFeatures(user.id);
      setFeatureCatalog(data.catalog);
      setFeatureDisabled(new Set(data.disabled));
    } finally {
      setFeaturesLoading(false);
    }
  }

  async function saveFeatures() {
    if (!featuresFor) return;
    await adminApi.updateUserFeatures(featuresFor.id, Array.from(featureDisabled));
    setFeaturesFor(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-muted-foreground">Manage user accounts and access</p>
        </div>
        <Button onClick={() => (showForm ? setShowForm(false) : openNew())}>
          <Plus className="size-4" /> Add User
        </Button>
      </div>

      {pageError && <p className="mb-4 text-sm text-destructive">{pageError}</p>}

      {showForm && (
        <Card className="mb-6">
          <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Display Name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
              <motion.div animate={emailShakeControls} initial={{ x: 0 }}>
                <Input
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyDown={handleEmailKeyDown}
                  className={!emailValid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
                />
              </motion.div>
              {!editingId && (
                <Input
                  type="password"
                  placeholder="Password (min. 6 characters)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                Grant Admin access
              </label>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Create User"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Users className="size-10 opacity-40" />
          <p>No user accounts found.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-foreground/5">
                    <td className="px-4 py-2">
                      <p className="font-medium">{u.displayName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      {u.isAdmin ? (
                        <Badge className="gap-1">
                          <ShieldCheck className="size-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u.isDisabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Edit"
                          onClick={() => openEdit(u)}
                          className="cursor-pointer text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          title="Manage features"
                          onClick={() => openFeatures(u)}
                          className="cursor-pointer text-muted-foreground hover:text-primary"
                        >
                          <SlidersHorizontal className="size-3.5" />
                        </button>
                        <button
                          title="Reset password"
                          onClick={() => {
                            setResetPasswordFor(u);
                            setNewPassword("");
                            setResetError(null);
                          }}
                          className="cursor-pointer text-muted-foreground hover:text-primary"
                        >
                          <KeyRound className="size-3.5" />
                        </button>
                        {u.isDisabled ? (
                          <button
                            title="Re-enable account"
                            onClick={() => handleReEnable(u)}
                            className="cursor-pointer text-muted-foreground hover:text-brand-green"
                          >
                            <CheckCircle2 className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            title="Disable account"
                            onClick={() => setDisableTarget(u)}
                            className="cursor-pointer text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="size-3.5" />
                          </button>
                        )}
                        <DeleteIconButton
                          onDelete={() => handleDelete(u.id)}
                          title="Delete this account?"
                          description={`${u.displayName || u.email} will be permanently removed, along with their attendance, contacts, and settings.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {disableTarget &&
        createPortal(
          <ConfirmDialog
            title="Disable this account?"
            description={`${disableTarget.displayName || disableTarget.email} will be immediately signed out and unable to log back in until re-enabled.`}
            confirmLabel="Disable"
            cancelLabel="Cancel"
            onConfirm={confirmToggleDisable}
            onCancel={() => setDisableTarget(null)}
          />,
          document.body
        )}

      {resetPasswordFor &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Reset Password</h2>
                <button onClick={() => setResetPasswordFor(null)} className="rounded-full p-1 hover:bg-foreground/5">
                  <X className="size-4" />
                </button>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Setting a new password for <span className="font-medium text-foreground">{resetPasswordFor.email}</span>
              </p>
              <Input
                type="password"
                placeholder="New password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {resetError && <p className="mt-2 text-sm text-destructive">{resetError}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResetPasswordFor(null)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword}>Reset Password</Button>
              </div>
            </Card>
          </div>,
          document.body
        )}

      {featuresFor &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Manage Features</h2>
                <button onClick={() => setFeaturesFor(null)} className="rounded-full p-1 hover:bg-foreground/5">
                  <X className="size-4" />
                </button>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Toggle which optional sections{" "}
                <span className="font-medium text-foreground">{featuresFor.displayName || featuresFor.email}</span> can access.
              </p>
              {featuresLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {featureCatalog.map((key) => {
                    const enabled = !featureDisabled.has(key);
                    return (
                      <label key={key} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-foreground/5">
                        <span className="text-sm">{FEATURE_LABELS[key] ?? key}</span>
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => {
                            setFeatureDisabled((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.delete(key);
                              else next.add(key);
                              return next;
                            });
                          }}
                          className="size-4 rounded border-input"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFeaturesFor(null)}>
                  Cancel
                </Button>
                <Button onClick={saveFeatures}>Save</Button>
              </div>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
}
