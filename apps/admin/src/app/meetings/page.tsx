"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MeetingType {
  id: string;
  name: string;
  durationMin: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Booking {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  conferencingLink: string | null;
  timezone: string | null;
  meetingType: { name: string; durationMin: number };
  lead: { id: string; customerName: string; projectName: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  COMPLETED: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

interface TypeDraft {
  id?: string;
  name: string;
  durationMin: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}
const EMPTY_TYPE: TypeDraft = { name: "", durationMin: 15, description: "", isActive: true, sortOrder: 0 };

export default function MeetingsPage() {
  const [tab, setTab] = useState<"bookings" | "types">("bookings");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [newType, setNewType] = useState<TypeDraft | null>(null);

  const loadBookings = (f = filter) => {
    fetch(`/api/admin-meetings?filter=${f}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setBookings(d));
  };
  const loadTypes = () => {
    fetch("/api/meeting-types")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setTypes(d));
  };

  useEffect(() => { loadBookings(filter); }, [filter]);
  useEffect(() => { loadTypes(); }, []);

  async function updateBooking(id: string, patch: Partial<Booking>) {
    await fetch(`/api/admin-meetings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadBookings();
  }

  async function saveType() {
    if (editingType) {
      await fetch(`/api/meeting-types/${editingType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingType),
      });
      setEditingType(null);
    } else if (newType) {
      await fetch("/api/meeting-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
      });
      setNewType(null);
    }
    loadTypes();
  }

  async function deactivateType(id: string) {
    if (!confirm("Hide this meeting type from the booking page? Existing bookings stay intact.")) return;
    await fetch(`/api/meeting-types/${id}`, { method: "DELETE" });
    loadTypes();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Meetings</h1>
      </div>

      <div className="flex gap-1 mb-5 border-b dark:border-gray-700">
        {[
          { key: "bookings", label: "Bookings" },
          { key: "types", label: "Meeting Types" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "bookings" | "types")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? "border-[#01358d] text-[#01358d] dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bookings" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            {(["upcoming", "past", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition capitalize ${
                  filter === f
                    ? "bg-[#01358d] text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No bookings in this view.
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const start = new Date(b.startsAt);
                return (
                  <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{b.attendeeName}</h3>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[b.status]}`}>{b.status}</span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">{b.meetingType.name} · {b.meetingType.durationMin} min</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {b.attendeeEmail}{b.attendeePhone ? ` · ${b.attendeePhone}` : ""}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                          {start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          <span className="text-xs text-gray-400 ml-2">{b.timezone ? `(booked from ${b.timezone})` : ""}</span>
                        </p>
                        {b.lead && (
                          <Link href={`/leads/${b.lead.id}`} className="text-xs text-[#01358d] dark:text-blue-400 hover:underline mt-1 inline-block">
                            {b.lead.customerName} · {b.lead.projectName}
                          </Link>
                        )}
                        {b.notes && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                            {b.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          type="text"
                          defaultValue={b.conferencingLink || ""}
                          placeholder="Conferencing link"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (b.conferencingLink || "")) updateBooking(b.id, { conferencingLink: v || null });
                          }}
                          className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
                        />
                        <select
                          value={b.status}
                          onChange={(e) => updateBooking(b.id, { status: e.target.value })}
                          className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                        >
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "types" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setNewType({ ...EMPTY_TYPE })}
              className="px-3 py-1.5 bg-[#01358d] hover:bg-[#012a70] text-white text-xs font-medium rounded-lg transition"
            >
              + Add meeting type
            </button>
          </div>

          {newType && (
            <TypeEditor
              value={newType}
              onChange={setNewType}
              onSave={saveType}
              onCancel={() => setNewType(null)}
              label="New meeting type"
            />
          )}

          <div className="space-y-3">
            {types.map((t) => (
              editingType?.id === t.id ? (
                <TypeEditor
                  key={t.id}
                  value={editingType}
                  onChange={(v) => setEditingType(v as MeetingType)}
                  onSave={saveType}
                  onCancel={() => setEditingType(null)}
                  label="Editing"
                />
              ) : (
                <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                      <span className="text-xs text-[#01358d] dark:text-blue-400 font-medium">{t.durationMin} min</span>
                      {!t.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">hidden</span>}
                    </div>
                    {t.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingType(t)}
                      className="text-xs text-[#01358d] dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    {t.isActive && (
                      <button
                        onClick={() => deactivateType(t.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TypeEditor({
  value,
  onChange,
  onSave,
  onCancel,
  label,
}: {
  value: TypeDraft;
  onChange: (v: TypeDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-[#01358d] p-4 mb-3">
      <p className="text-[10px] uppercase tracking-wide text-[#01358d] font-medium mb-2">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <input
          type="text"
          placeholder="Name (e.g. Quick Chat)"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none sm:col-span-2"
        />
        <input
          type="number"
          min={5}
          step={5}
          value={value.durationMin}
          onChange={(e) => onChange({ ...value, durationMin: parseInt(e.target.value) || 15 })}
          className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
        />
      </div>
      <textarea
        placeholder="Description shown to customers (optional)"
        value={value.description || ""}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        rows={2}
        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-y mb-3"
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(e) => onChange({ ...value, isActive: e.target.checked })}
          />
          Visible on booking page
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
          <button onClick={onSave} className="px-3 py-1.5 text-xs bg-[#01358d] hover:bg-[#012a70] text-white rounded-lg font-medium">Save</button>
        </div>
      </div>
    </div>
  );
}
