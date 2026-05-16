"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const GOAL_LABELS: Record<string, string> = {
  BOOK_MEETING: "Book a Meeting",
  GET_REPLY: "Get a Reply",
  DRIVE_PURCHASE: "Drive a Purchase",
  NURTURE_ONLY: "Nurture Only",
};

const GOAL_COLORS: Record<string, string> = {
  BOOK_MEETING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  GET_REPLY: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  DRIVE_PURCHASE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  NURTURE_ONLY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PAUSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "PAUSED";

interface Sequence {
  id: string;
  name: string;
  goal: string;
  status: string;
  enrollmentTrigger: string;
  createdAt: string;
  _count: { steps: number; enrollments: number };
}

interface RecipientResult {
  lead: { id: string; customerName: string; customerEmail: string; companyName: string | null };
  enrollments: { sequenceId: string; sequenceName: string; status: string; currentStepOrder: number; lastAction: string; enrolledAt: string; exitReason: string | null }[];
  bySequence: { sequenceId: string; sequenceName: string; count: number; lastSentAt: string | null }[];
  totalSequenceEmails: number;
}

export default function SequencesListPage() {
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  // Recipient lookup
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResult, setLookupResult] = useState<RecipientResult[] | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sequences")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSequences(data); })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { ALL: sequences.length, ACTIVE: 0, DRAFT: 0, PAUSED: 0 };
    for (const s of sequences) {
      if (s.status === "ACTIVE") c.ACTIVE++;
      else if (s.status === "DRAFT") c.DRAFT++;
      else if (s.status === "PAUSED") c.PAUSED++;
    }
    return c;
  }, [sequences]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sequences.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sequences, statusFilter, search]);

  async function handleLookup() {
    const email = lookupEmail.trim();
    if (!email) {
      setLookupError("Enter an email address to look up.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/sequences/recipient-lookup?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || "Lookup failed");
      } else {
        setLookupResult(data.results || []);
      }
    } catch {
      setLookupError("Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  const PILL_OPTIONS: { value: StatusFilter; label: string; activeClasses: string }[] = [
    { value: "ALL", label: "All", activeClasses: "bg-indigo-600 text-white" },
    { value: "ACTIVE", label: "Active", activeClasses: "bg-green-600 text-white" },
    { value: "DRAFT", label: "Draft", activeClasses: "bg-yellow-500 text-white" },
    { value: "PAUSED", label: "Paused", activeClasses: "bg-gray-500 text-white" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Smart Sequences</h1>
        <button
          onClick={() => router.push("/sequences/new")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + New Sequence
        </button>
      </div>

      {/* Recipient lookup */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Find recipient by email</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">See every sequence email a contact has received.</p>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="email"
              placeholder="contact@example.com"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {lookupLoading ? "Looking..." : "Look up"}
            </button>
          </div>
        </div>

        {lookupError && (
          <p className="mt-2 text-xs text-red-500">{lookupError}</p>
        )}

        {lookupResult !== null && !lookupError && (
          <div className="mt-3">
            {lookupResult.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No leads found for that email.</p>
            ) : (
              <div className="space-y-3">
                {lookupResult.map((r) => (
                  <div key={r.lead.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <button
                          onClick={() => router.push(`/leads/${r.lead.id}`)}
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {r.lead.customerName}
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{r.lead.customerEmail}</span>
                        {r.lead.companyName && <span className="text-xs text-gray-400 ml-2">· {r.lead.companyName}</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">{r.totalSequenceEmails}</strong> sequence emails ·{" "}
                        <strong className="text-gray-900 dark:text-white">{r.enrollments.filter((e) => e.status === "ACTIVE").length}</strong> currently active
                      </div>
                    </div>

                    {r.bySequence.length === 0 ? (
                      <p className="text-xs text-gray-400">No sequence emails sent.</p>
                    ) : (
                      <div className="space-y-1">
                        {r.bySequence.map((bs) => {
                          const enrollment = r.enrollments.find((e) => e.sequenceId === bs.sequenceId);
                          return (
                            <div key={bs.sequenceId} className="flex items-center justify-between text-xs gap-2">
                              <button
                                onClick={() => router.push(`/sequences/${bs.sequenceId}`)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline truncate flex-1 text-left"
                              >
                                {bs.sequenceName}
                              </button>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-gray-600 dark:text-gray-300">{bs.count} sent</span>
                                {bs.lastSentAt && <span className="text-gray-400">· last {new Date(bs.lastSentAt).toLocaleDateString()}</span>}
                                {enrollment && (
                                  <span className={`px-1.5 py-0.5 rounded ${enrollment.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : enrollment.status === "PAUSED" ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                                    {enrollment.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PILL_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              statusFilter === opt.value
                ? opt.activeClasses
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {opt.label} <span className="opacity-70">({counts[opt.value]})</span>
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700 w-full sm:w-64"
        />
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading sequences...</p>
      ) : sequences.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">No sequences yet</p>
          <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">Create a form-driven email sequence with structured delays, branching, and contact tracking.</p>
          <button
            onClick={() => router.push("/sequences/new")}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            Create your first sequence
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          No sequences match the current filters.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Goal</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Steps</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrolled</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trigger</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((seq) => (
                  <tr
                    key={seq.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                    onClick={() => router.push(`/sequences/${seq.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{seq.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GOAL_COLORS[seq.goal] || "bg-gray-100 text-gray-800"}`}>
                        {GOAL_LABELS[seq.goal] || seq.goal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[seq.status] || "bg-gray-100 text-gray-800"}`}>
                        {seq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {seq._count.steps} steps
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {seq._count.enrollments}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {seq.enrollmentTrigger.replace("_", " ").toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(seq.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
