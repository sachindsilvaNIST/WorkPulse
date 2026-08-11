"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { contactsApi } from "@/lib/api/client";
import type { ContactRecord } from "@/lib/api/types";

function emptyContact(): Partial<ContactRecord> {
  return { affiliation: "", familyName: "", givenName: "", department: "", email: "", intercom: "", contactNumber: "", notes: "" };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ContactRecord>>(emptyContact());

  useEffect(() => {
    contactsApi.getAll().then((data) => {
      setContacts(data.contacts);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...contacts].sort(
      (a, b) => a.affiliation.localeCompare(b.affiliation) || a.familyName.localeCompare(b.familyName)
    );
    if (!q) return sorted;
    return sorted.filter((c) =>
      `${c.affiliation} ${c.familyName} ${c.givenName} ${c.department} ${c.email} ${c.contactNumber}`
        .toLowerCase()
        .includes(q)
    );
  }, [contacts, search]);

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

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="Affiliation" value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
            <Input placeholder="Family Name" value={form.familyName} onChange={(e) => setForm({ ...form, familyName: e.target.value })} />
            <Input placeholder="Given Name" value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} />
            <Input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Contact Number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
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
          <Card key={c.id} className="p-4">
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
                onClick={() => handleDelete(c.id)}
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
        ))}
      </div>
    </div>
  );
}
