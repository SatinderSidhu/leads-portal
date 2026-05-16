"use client";

import { useCallback, useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface Props {
  leadId: string;
  /** Fired after add / edit / remove so the parent (e.g. the lead detail
   *  page) can refresh state that depends on the contact list — most
   *  notably the compose form's auto-CC prefill. */
  onContactsChanged?: () => void;
}

const EMPTY_FORM = { name: "", email: "", phone: "", role: "" };

export default function LeadContactsPanel({ leadId, onContactsChanged }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/contacts`, { cache: "no-store" });
      if (res.ok) setContacts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function startEdit(c: Contact) {
    setAdding(false);
    setEditingId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone || "", role: c.role || "" });
    setError(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/leads/${leadId}/contacts/${editingId}`
        : `/api/leads/${leadId}/contacts`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      cancel();
      await load();
      onContactsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(c: Contact) {
    if (!confirm(`Remove ${c.name} <${c.email}> from this lead? They'll stop receiving project emails.`)) return;
    const res = await fetch(`/api/leads/${leadId}/contacts/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      onContactsChanged?.();
    }
  }

  const isFormOpen = adding || editingId !== null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Additional Contacts</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            CC&apos;d on all customer-facing emails (welcome, status, NDA, SOW, App Flow, manual). Can sign in to the customer portal with their own email.
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={startAdd}
            className="text-xs px-3 py-1.5 bg-[#01358d] text-white rounded-lg font-medium hover:bg-[#012a70] transition flex-shrink-0"
          >
            + Add
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <>
          {contacts.length === 0 && !isFormOpen && (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
              No additional contacts. Click <strong>Add</strong> to include a co-watcher (spouse, partner, project sponsor).
            </p>
          )}

          {contacts.length > 0 && (
            <ul className="space-y-2 mb-3">
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                      {c.role && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#01358d] dark:text-blue-400 font-medium">
                          {c.role}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}</div>
                    {c.phone && <div className="text-xs text-gray-400 dark:text-gray-500">{c.phone}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-[11px] text-gray-500 hover:text-[#01358d] transition px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(c)}
                      className="text-[11px] text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isFormOpen && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2 bg-gray-50/50 dark:bg-gray-900/20">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {editingId ? "Edit contact" : "Add a contact"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Name"
                  className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email"
                  className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone (optional)"
                  className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                />
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="Role e.g. Partner, Spouse (optional)"
                  className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={cancel}
                  disabled={submitting}
                  className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={submitting || !form.name.trim() || !form.email.trim()}
                  className="text-xs px-3 py-1.5 bg-[#01358d] text-white rounded-md font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? "Saving…" : editingId ? "Save" : "Add"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
