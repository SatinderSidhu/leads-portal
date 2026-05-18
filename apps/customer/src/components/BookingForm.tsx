"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface MeetingType {
  id: string;
  name: string;
  durationMin: number;
  description: string | null;
}

interface DayOption {
  date: string;
  weekday: string;
  dayMonth: string;
}

interface BookingFormProps {
  /** Optional lead ID to associate the booking with (from ?leadId= or session). */
  leadId?: string;
  /** Prefill name when the customer is already signed in. */
  defaultName?: string;
  /** Prefill email when the customer is already signed in. */
  defaultEmail?: string;
  /** Optional header shown above the form. Pass null to hide. */
  header?: React.ReactNode;
}

export default function BookingForm({ leadId, defaultName, defaultEmail, header }: BookingFormProps) {
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [typeId, setTypeId] = useState("");
  const [days, setDays] = useState<DayOption[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState(defaultName || "");
  const [email, setEmail] = useState(defaultEmail || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmation, setConfirmation] = useState<{ meetingTypeName: string; durationMin: number; startsAt: string } | null>(null);

  const browserTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; }
  }, []);

  // Load meeting types on mount.
  useEffect(() => {
    fetch("/api/meetings/types")
      .then((r) => r.json())
      .then((data: MeetingType[]) => {
        setTypes(data);
        if (data.length > 0) setTypeId(data[0].id);
      })
      .catch(() => setError("Couldn't load meeting options. Please try again."));
  }, []);

  // Load days the moment a type is picked. Days don't actually depend
  // on the type for v1 (same business hours) but the API enforces an
  // active type, so we wait for typeId.
  useEffect(() => {
    if (!typeId) return;
    fetch(`/api/meetings/availability?typeId=${typeId}`)
      .then((r) => r.json())
      .then((data) => { if (data.days) setDays(data.days); });
    setDate("");
    setSlot("");
    setSlots([]);
  }, [typeId]);

  // Load slots when a date is picked.
  const fetchSlots = useCallback(async (typeIdArg: string, dateArg: string) => {
    setLoadingSlots(true);
    setSlot("");
    try {
      const res = await fetch(`/api/meetings/availability?typeId=${typeIdArg}&date=${dateArg}`);
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (typeId && date) fetchSlots(typeId, date);
  }, [typeId, date, fetchSlots]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId || !slot || !name.trim() || !email.trim()) {
      setError("Please fill in your name, email, and pick a time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeId,
          startsAt: slot,
          attendeeName: name.trim(),
          attendeeEmail: email.trim(),
          attendeePhone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          leadId: leadId || undefined,
          timezone: browserTz || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't book that slot — please try another.");
        if (res.status === 409) fetchSlots(typeId, date); // refresh slots
        return;
      }
      setConfirmation(data);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (confirmation) {
    const dt = new Date(confirmation.startsAt);
    const friendly = dt.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">You&apos;re booked!</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{confirmation.meetingTypeName} · {confirmation.durationMin} minutes</p>
        <p className="text-base font-medium text-gray-900 dark:text-white mt-4">{friendly}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{browserTz}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-6">A confirmation email is on its way to <strong>{email}</strong>.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We&apos;ll send the conferencing link separately.</p>
      </div>
    );
  }

  // ── Booking form ──────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-6 sm:p-8">
      {header}

      <form onSubmit={submit} className="space-y-6">
        {/* 1. Meeting type */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">1. Pick a meeting type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeId(t.id)}
                className={`text-left p-4 rounded-xl border-2 transition ${typeId === t.id ? "border-[#01358d] bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}`}
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                <p className="text-xs text-[#01358d] dark:text-blue-400 mt-0.5">{t.durationMin} minutes</p>
                {t.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{t.description}</p>}
              </button>
            ))}
            {types.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full">Loading meeting types…</p>
            )}
          </div>
        </div>

        {/* 2. Date */}
        {typeId && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">2. Pick a day</p>
            <div className="flex gap-2 flex-wrap">
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setDate(d.date)}
                  className={`px-3 py-2 rounded-lg border text-center min-w-[64px] transition ${date === d.date ? "border-[#01358d] bg-[#01358d] text-white" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300"}`}
                >
                  <p className="text-[10px] uppercase tracking-wide opacity-80">{d.weekday}</p>
                  <p className="text-sm font-semibold">{d.dayMonth}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Time slot */}
        {date && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              3. Pick a time {browserTz && <span className="normal-case text-gray-400">· {browserTz}</span>}
            </p>
            {loadingSlots ? (
              <p className="text-sm text-gray-400">Looking up availability…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400">No availability this day. Try another date.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {slots.map((iso) => {
                  const t = new Date(iso);
                  const label = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSlot(iso)}
                      className={`px-2 py-2 rounded-lg border text-sm font-medium transition ${slot === iso ? "border-[#01358d] bg-[#01358d] text-white" : "border-gray-200 dark:border-gray-700 hover:border-[#01358d] hover:text-[#01358d] text-gray-700 dark:text-gray-300"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Your details */}
        {slot && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">4. Your details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d]"
              />
              <input
                type="email"
                placeholder="email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d]"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d] sm:col-span-2"
              />
              <textarea
                placeholder="Anything you'd like us to know? (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d] sm:col-span-2 resize-y"
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {slot && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-3 bg-[#01358d] hover:bg-[#012a70] text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting ? "Booking…" : "Confirm meeting"}
          </button>
        )}
      </form>
    </div>
  );
}
