"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Mail, MessageSquare, Pencil, Phone, Plus, StickyNote, Trash2, Users, X } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteIconButton } from "@/components/ui/delete-icon-button";
import { CopyButton } from "@/components/ui/copy-button";
import { DetailRow } from "@/components/ui/detail-row";
import { contactsApi } from "@/lib/api/client";
import type { ContactRecord } from "@/lib/api/types";
import { categoryColor } from "@/lib/category-color";
import { cn } from "@/lib/utils";
import { useShakeAnimation } from "@/hooks/use-shake-animation";
import { EMAIL_PATTERN, NUMERIC_PATTERN, isControlKeystroke, isEmailKeystrokeAllowed, isNumericKeystrokeAllowed } from "@/lib/validation";
import { Spinner } from "@/components/ui/spinner";

function emptyContact(): Partial<ContactRecord> {
  return { affiliation: "", familyName: "", givenName: "", department: "", email: "", intercom: "", contactNumber: "", notes: "" };
}

/** Distinct, non-empty previously entered values for one contact field, most-recently-added
 * first (Set preserves insertion order, so reversing the source array surfaces newer entries
 * before older ones without needing a separate timestamp sort). */
function fieldHistory(contacts: ContactRecord[], field: keyof ContactRecord): string[] {
  const seen = new Set<string>();
  for (let i = contacts.length - 1; i >= 0; i--) {
    const v = (contacts[i][field] as string | undefined)?.trim();
    if (v) seen.add(v);
  }
  return Array.from(seen);
}


export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ContactRecord>>(emptyContact());
  const [detail, setDetail] = useState<ContactRecord | null>(null);

  useEffect(() => {
    contactsApi.getAll().then((data) => {
      setContacts(data.contacts);
      setLoading(false);
    });
  }, []);

  const departments = useMemo(() => {
    const set = new Set(contacts.map((c) => c.department).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [contacts]);

  const affiliationHistory = useMemo(() => fieldHistory(contacts, "affiliation"), [contacts]);
  const familyNameHistory = useMemo(() => fieldHistory(contacts, "familyName"), [contacts]);
  const givenNameHistory = useMemo(() => fieldHistory(contacts, "givenName"), [contacts]);
  const departmentHistory = useMemo(() => fieldHistory(contacts, "department"), [contacts]);
  const emailHistory = useMemo(() => fieldHistory(contacts, "email"), [contacts]);
  const contactNumberHistory = useMemo(() => fieldHistory(contacts, "contactNumber"), [contacts]);
  const intercomHistory = useMemo(() => fieldHistory(contacts, "intercom"), [contacts]);
  const notesHistory = useMemo(() => fieldHistory(contacts, "notes"), [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;
    if (department !== "All") list = list.filter((c) => c.department === department);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        `${c.affiliation} ${c.familyName} ${c.givenName} ${c.department} ${c.email} ${c.contactNumber}`
          .toLowerCase()
          .includes(q)
      );
    }
    return [...list].sort((a, b) => a.affiliation.localeCompare(b.affiliation) || a.familyName.localeCompare(b.familyName));
  }, [contacts, search, department]);

  function openNew() {
    setEditingId(null);
    setForm(emptyContact());
    setShowForm(true);
  }

  function openEdit(contact: ContactRecord) {
    setEditingId(contact.id);
    setForm(contact);
    setShowForm(true);
  }

  const emailTrimmed = (form.email ?? "").trim();
  const emailValid = emailTrimmed === "" || EMAIL_PATTERN.test(emailTrimmed);
  const contactNumberTrimmed = (form.contactNumber ?? "").trim();
  const contactNumberValid = contactNumberTrimmed === "" || NUMERIC_PATTERN.test(contactNumberTrimmed);
  const intercomTrimmed = (form.intercom ?? "").trim();
  const intercomValid = intercomTrimmed === "" || NUMERIC_PATTERN.test(intercomTrimmed);
  const canSubmit = !!form.familyName?.trim() && emailValid && contactNumberValid && intercomValid;

  const { controls: emailShakeControls, shake: shakeEmail } = useShakeAnimation();
  const { controls: contactNumberShakeControls, shake: shakeContactNumber } = useShakeAnimation();
  const { controls: intercomShakeControls, shake: shakeIntercom } = useShakeAnimation();

  function attemptSave() {
    if (!canSubmit) {
      if (!emailValid) shakeEmail();
      if (!contactNumberValid) shakeContactNumber();
      if (!intercomValid) shakeIntercom();
      return;
    }
    void handleSave();
  }

  // Blocks the keystroke and shakes immediately when the typed character itself violates the
  // field's rule — rather than only validating the accumulated string on Save — so "only numeric"
  // reads as instant per-character feedback, the way it does in native macOS numeric fields.
  function handleNumericKeyDown(shake: () => void) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isControlKeystroke(e)) return;
      if (isNumericKeystrokeAllowed(e.key)) return;
      e.preventDefault();
      shake();
    };
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isControlKeystroke(e)) return;
    if (!isEmailKeystrokeAllowed(e.key, form.email ?? "")) {
      e.preventDefault();
      shakeEmail();
    }
  }

  async function handleSave() {
    if (!canSubmit) return;
    if (editingId) {
      await contactsApi.update(editingId, form);
      const updated = { ...(form as ContactRecord), id: editingId };
      setContacts((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      if (detail?.id === editingId) setDetail(updated);
    } else {
      const created = await contactsApi.create(form);
      setContacts((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(emptyContact());
  }

  async function handleDelete(id: string) {
    await contactsApi.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; contact: ContactRecord } | null>(null);

  function handleCardContextMenu(e: React.MouseEvent, contact: ContactRecord) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, contact });
  }

  useEffect(() => {
    if (!contextMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (!contextMenuRef.current?.contains(e.target as Node)) setContextMenu(null);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [contextMenu]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contact Book</h1>
          <p className="mt-1 text-muted-foreground">Search contacts, departments and email directory</p>
        </div>
        <Button onClick={() => (showForm ? setShowForm(false) : openNew())}>
          <Plus className="size-4" /> Add Contact
        </Button>
      </div>

      <SearchInput placeholder="Search…" value={search} onValueChange={setSearch} className="mb-4 max-w-md" />

      {departments.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDepartment(d)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                d === department
                  ? "border-primary/40 bg-primary/15 text-primary ring-2 ring-primary/25 ring-offset-1 ring-offset-background"
                  : "border-border bg-background/40 text-muted-foreground hover:bg-foreground/5"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AutocompleteInput
              placeholder="Affiliation"
              value={form.affiliation ?? ""}
              onValueChange={(v) => setForm({ ...form, affiliation: v })}
              suggestions={affiliationHistory}
            />
            <AutocompleteInput
              placeholder="Family Name"
              value={form.familyName ?? ""}
              onValueChange={(v) => setForm({ ...form, familyName: v })}
              suggestions={familyNameHistory}
            />
            <AutocompleteInput
              placeholder="Given Name"
              value={form.givenName ?? ""}
              onValueChange={(v) => setForm({ ...form, givenName: v })}
              suggestions={givenNameHistory}
            />
            <AutocompleteInput
              placeholder="Department"
              value={form.department ?? ""}
              onValueChange={(v) => setForm({ ...form, department: v })}
              suggestions={departmentHistory}
            />
            <motion.div animate={emailShakeControls} initial={{ x: 0 }}>
              <AutocompleteInput
                placeholder="Email (e.g. name@domain.com)"
                value={form.email ?? ""}
                onValueChange={(v) => setForm({ ...form, email: v })}
                suggestions={emailHistory}
                onKeyDown={handleEmailKeyDown}
                className={!emailValid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
              />
              {!emailValid && <p className="mt-1 text-xs text-destructive">Enter a valid email, e.g. name@domain.com</p>}
            </motion.div>
            <motion.div animate={contactNumberShakeControls} initial={{ x: 0 }}>
              <AutocompleteInput
                placeholder="Contact Number"
                inputMode="numeric"
                value={form.contactNumber ?? ""}
                onValueChange={(v) => setForm({ ...form, contactNumber: v })}
                suggestions={contactNumberHistory}
                onKeyDown={handleNumericKeyDown(shakeContactNumber)}
                className={!contactNumberValid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
              />
              {!contactNumberValid && <p className="mt-1 text-xs text-destructive">Numbers only, no spaces or symbols</p>}
            </motion.div>
            <motion.div animate={intercomShakeControls} initial={{ x: 0 }}>
              <AutocompleteInput
                placeholder="Intercom"
                inputMode="numeric"
                value={form.intercom ?? ""}
                onValueChange={(v) => setForm({ ...form, intercom: v })}
                suggestions={intercomHistory}
                onKeyDown={handleNumericKeyDown(shakeIntercom)}
                className={!intercomValid ? "border-destructive focus-visible:ring-destructive/40" : undefined}
              />
              {!intercomValid && <p className="mt-1 text-xs text-destructive">Numbers only, no spaces or symbols</p>}
            </motion.div>
            <AutocompleteInput
              className="sm:col-span-2"
              placeholder="Notes"
              value={form.notes ?? ""}
              onValueChange={(v) => setForm({ ...form, notes: v })}
              suggestions={notesHistory}
            />
            <div className="flex gap-2 sm:col-span-3">
              <Button onClick={attemptSave}>{editingId ? "Update" : "Save"}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={16} /> Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Users className="size-10 opacity-40" />
          <p>No contacts found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const accent = categoryColor(c.department);
          return (
            <motion.div key={c.id} layoutId={`contact-${c.id}`} whileHover={{ y: -2 }}>
              <Card
                className="cursor-pointer p-4"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
                }}
                onClick={() => setDetail(c)}
                onContextMenu={(e) => handleCardContextMenu(e, c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {c.familyName} {c.givenName}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.affiliation}</p>
                  </div>
                  <DeleteIconButton
                    onDelete={() => handleDelete(c.id)}
                    title="Delete this contact?"
                    description={`${c.familyName} ${c.givenName} will be permanently removed.`}
                  />
                </div>
                {c.department && (
                  <span
                    className="mt-2 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)` }}
                  >
                    {c.department}
                  </span>
                )}
                {c.email && (
                  <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3 shrink-0" /> <span className="truncate">{c.email}</span>
                    <CopyButton value={c.email} className="ml-auto" />
                  </p>
                )}
                {c.contactNumber && (
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3 shrink-0" /> <span className="truncate">{c.contactNumber}</span>
                    <CopyButton value={c.contactNumber} className="ml-auto" />
                  </p>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="glass-panel fixed z-50 min-w-[160px] p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                openEdit(contextMenu.contact);
                setContextMenu(null);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-foreground hover:bg-foreground/10"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => setContextMenu(null)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <X className="size-3.5" /> Cancel
            </button>
          </div>,
          document.body
        )}

      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setDetail(null)}
          >
            <motion.div layoutId={`contact-${detail.id}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
              <Card className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {detail.familyName} {detail.givenName}
                    </h2>
                    <p className="text-sm text-muted-foreground">{detail.affiliation}</p>
                  </div>
                  <button onClick={() => setDetail(null)} className="rounded-full p-1 hover:bg-foreground/5">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <DetailRow icon={Building2} label="Department" value={detail.department} />
                  <DetailRow icon={Mail} label="Email" value={detail.email} copyable />
                  <DetailRow icon={Phone} label="Contact Number" value={detail.contactNumber} copyable />
                  <DetailRow icon={MessageSquare} label="Intercom" value={detail.intercom} copyable />
                  <DetailRow icon={StickyNote} label="Notes" value={detail.notes} />
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="destructive" onClick={() => handleDelete(detail.id)}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
