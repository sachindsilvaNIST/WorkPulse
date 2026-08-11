"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Mail, MessageSquare, Phone, Plus, Search, StickyNote, Trash2, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { contactsApi } from "@/lib/api/client";
import type { ContactRecord } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function emptyContact(): Partial<ContactRecord> {
  return { affiliation: "", familyName: "", givenName: "", department: "", email: "", intercom: "", contactNumber: "", notes: "" };
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  async function handleSave() {
    if (!form.familyName) return;
    const created = await contactsApi.create(form);
    setContacts((prev) => [...prev, created]);
    setShowForm(false);
    setForm(emptyContact());
  }

  async function handleDelete(id: string) {
    await contactsApi.delete(id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contact Book</h1>
          <p className="mt-1 text-muted-foreground">Search contacts, departments and email directory</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> Add Contact
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

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
            <Input placeholder="Affiliation" value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
            <Input placeholder="Family Name" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} />
            <Input placeholder="Given Name" value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} />
            <Input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
            <Input placeholder="Intercom" value={form.intercom} onChange={(e) => setForm({ ...form, intercom: e.target.value })} />
            <Input className="sm:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="flex gap-2 sm:col-span-3">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <Users className="size-10 opacity-40" />
          <p>No contacts found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <motion.div key={c.id} layoutId={`contact-${c.id}`} whileHover={{ y: -2 }}>
            <Card className="cursor-pointer p-4" onClick={() => setDetail(c)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {c.familyName} {c.givenName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.affiliation}
                    {c.department ? ` · ${c.department}` : ""}
                  </p>
                </div>
                <Trash2
                  className="size-4 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(c.id);
                  }}
                />
              </div>
              {c.email && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3" /> {c.email}
                </p>
              )}
              {c.contactNumber && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="size-3" /> {c.contactNumber}
                </p>
              )}
            </Card>
          </motion.div>
        ))}
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
                  <DetailRow icon={Mail} label="Email" value={detail.email} />
                  <DetailRow icon={Phone} label="Contact Number" value={detail.contactNumber} />
                  <DetailRow icon={MessageSquare} label="Intercom" value={detail.intercom} />
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
