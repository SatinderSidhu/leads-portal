"use client";

import { useEffect, useState } from "react";

type QuestionType = "short_text" | "long_text" | "single_choice" | "yes_no";

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  helpText?: string;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  answers: Record<string, unknown>;
  status: "SENT" | "IN_PROGRESS" | "SUBMITTED";
  sentAt: string | null;
  submittedAt: string | null;
}

interface Props {
  leadId: string;
  isLoggedIn: boolean;
  returnTo: string;
}

export default function QuestionnaireSection({ leadId, isLoggedIn, returnTo }: Props) {
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetch(`/api/questionnaire?leadId=${leadId}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setQ(data);
          setAnswers((data.answers as Record<string, unknown>) || {});
        }
      })
      .finally(() => setLoading(false));
  }, [leadId, isLoggedIn]);

  // Auto-save draft 1.5s after the customer stops typing
  useEffect(() => {
    if (!q || q.status === "SUBMITTED") return;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/questionnaire", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, answers, submit: false }),
        });
        if (res.ok) {
          const data = await res.json();
          setSavedAt(new Date());
          if (data.status && data.status !== q.status) {
            setQ((prev) => prev ? { ...prev, status: data.status } : prev);
          }
        }
      } catch { /* swallow draft errors */ }
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  function update(qid: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function handleSubmit() {
    if (!q) return;
    if (!confirm("Submit your answers? You won't be able to edit after this.")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, answers, submit: true }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      const data = await res.json();
      setQ((prev) => prev ? { ...prev, status: data.status, submittedAt: data.submittedAt } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveNow() {
    setSaving(true);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, answers, submit: false }),
      });
      if (res.ok) setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="Sign in to view your questionnaire"
        body="Your project team has prepared a few questions to help scope your project. Sign in to answer them."
        cta={{ label: "Sign In", href: `/login?returnTo=${returnTo}` }}
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">Loading…</p>;
  }

  if (!q) {
    return (
      <EmptyState
        title="No questionnaire yet"
        body="When your project team has questions for you, they'll appear here."
      />
    );
  }

  const isSubmitted = q.status === "SUBMITTED";
  const requiredMissing = q.questions.filter((qu) => {
    if (!qu.required) return false;
    const a = answers[qu.id];
    return a === undefined || a === null || (typeof a === "string" && !a.trim());
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{q.title}</h2>
        {q.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-2 whitespace-pre-wrap">{q.description}</p>
        )}
      </div>

      {isSubmitted && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Thanks — your answers are in.</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">
              Submitted {q.submittedAt ? new Date(q.submittedAt).toLocaleString() : "just now"}. Your project team has been notified.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {q.questions.map((qu, idx) => (
          <div key={qu.id} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1">
              <span className="text-gray-400 mr-2 font-mono">{idx + 1}.</span>
              {qu.label}
              {qu.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {qu.helpText && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 ml-7">{qu.helpText}</p>
            )}
            <div className="ml-7 mt-3">
              {qu.type === "short_text" && (
                <input
                  type="text"
                  value={(answers[qu.id] as string) || ""}
                  onChange={(e) => update(qu.id, e.target.value)}
                  disabled={isSubmitted}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#01358d] disabled:opacity-60"
                />
              )}
              {qu.type === "long_text" && (
                <textarea
                  value={(answers[qu.id] as string) || ""}
                  onChange={(e) => update(qu.id, e.target.value)}
                  disabled={isSubmitted}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#01358d] disabled:opacity-60 resize-y"
                />
              )}
              {qu.type === "single_choice" && (
                <div className="space-y-2">
                  {(qu.options || []).map((opt) => (
                    <label key={opt} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition ${
                      answers[qu.id] === opt
                        ? "bg-[#01358d]/5 border-[#01358d] dark:bg-[#01358d]/20"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    } ${isSubmitted ? "cursor-default opacity-60" : ""}`}>
                      <input
                        type="radio"
                        name={qu.id}
                        value={opt}
                        checked={answers[qu.id] === opt}
                        onChange={() => update(qu.id, opt)}
                        disabled={isSubmitted}
                        className="w-4 h-4 text-[#01358d] border-gray-300 focus:ring-[#01358d]"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {qu.type === "yes_no" && (
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => !isSubmitted && update(qu.id, v)}
                      disabled={isSubmitted}
                      className={`flex-1 px-5 py-2.5 rounded-lg border text-sm font-medium transition ${
                        answers[qu.id] === v
                          ? "bg-[#01358d] border-[#01358d] text-white"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                      } ${isSubmitted ? "cursor-default opacity-60" : ""}`}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isSubmitted && (
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-gray-400">
            {savedAt ? `Saved at ${savedAt.toLocaleTimeString()}` : "Your answers save automatically"}
            {requiredMissing.length > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {requiredMissing.length} required question{requiredMissing.length === 1 ? "" : "s"} left
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSaveNow}
              disabled={saving || submitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || saving || requiredMissing.length > 0}
              className="px-5 py-2 bg-[#01358d] text-white rounded-lg text-sm font-semibold hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={requiredMissing.length > 0 ? `Answer the required question${requiredMissing.length === 1 ? "" : "s"} first` : ""}
            >
              {submitting ? "Submitting…" : "Submit Answers"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: string } }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{body}</p>
      {cta && (
        <a href={cta.href} className="inline-flex px-5 py-2 rounded-xl bg-[#01358d] hover:bg-[#012d75] text-sm font-medium text-white transition">
          {cta.label}
        </a>
      )}
    </div>
  );
}
