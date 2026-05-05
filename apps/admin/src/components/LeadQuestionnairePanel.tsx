"use client";

import { useEffect, useState, useCallback } from "react";
import QuestionEditor, { Question } from "./QuestionEditor";

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  answers: Record<string, unknown>;
  status: "DRAFT" | "SENT" | "IN_PROGRESS" | "SUBMITTED";
  sentAt: string | null;
  submittedAt: string | null;
  templateId: string | null;
}

interface Props {
  leadId: string;
  customerName: string;
  doNotContact: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent — awaiting answers",
  IN_PROGRESS: "Customer in progress",
  SUBMITTED: "Submitted",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  SENT: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  SUBMITTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function formatAnswer(q: Question, raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  if (q.type === "yes_no") return raw ? "Yes" : "No";
  return String(raw);
}

export default function LeadQuestionnairePanel({ leadId, customerName, doNotContact }: Props) {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, tRes] = await Promise.all([
        fetch(`/api/leads/${leadId}/questionnaire`, { cache: "no-store" }),
        fetch("/api/questionnaire-templates", { cache: "no-store" }),
      ]);
      const q = qRes.ok ? await qRes.json() : null;
      const t = tRes.ok ? await tRes.json() : [];
      setQuestionnaire(q);
      setTemplates(Array.isArray(t) ? t : []);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  function startEdit() {
    if (!questionnaire) return;
    setEditTitle(questionnaire.title);
    setEditDescription(questionnaire.description || "");
    setEditQuestions(questionnaire.questions);
    setEditing(true);
    setError(null);
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (creatingFromTemplate) {
        body.templateId = creatingFromTemplate;
      } else {
        body.title = `Discovery — ${customerName}`;
        body.questions = [];
      }
      const res = await fetch(`/api/leads/${leadId}/questionnaire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      const created = await res.json();
      setQuestionnaire(created);
      setShowCreate(false);
      // Open editor immediately if there are no questions yet
      if (!Array.isArray(created.questions) || created.questions.length === 0) {
        setEditTitle(created.title);
        setEditDescription(created.description || "");
        setEditQuestions(created.questions || []);
        setEditing(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      setError("Title is required");
      return;
    }
    if (editQuestions.some((q) => !q.label.trim())) {
      setError("Every question needs a label");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/questionnaire`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null, questions: editQuestions }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      const updated = await res.json();
      setQuestionnaire(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!questionnaire) return;
    if (questionnaire.questions.length === 0) {
      setError("Add questions before sending");
      return;
    }
    const isResend = !!questionnaire.sentAt;
    if (!confirm(isResend ? `Re-send the questionnaire to ${customerName}?` : `Send the questionnaire to ${customerName}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/questionnaire/send`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      const updated = await res.json();
      setQuestionnaire((prev) => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!questionnaire) return;
    if (!confirm("Delete this questionnaire? The customer will no longer see it.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/questionnaire`, { method: "DELETE" });
      if (res.ok) {
        setQuestionnaire(null);
      } else {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        setError(error || "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Questionnaire</h2>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  // ── No questionnaire yet ──
  if (!questionnaire && !showCreate) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Questionnaire</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Send the customer some questions to clarify scope before SOW.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition flex-shrink-0"
          >
            Create
          </button>
        </div>
      </div>
    );
  }

  // ── Create flow ──
  if (showCreate && !questionnaire) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Questionnaire</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start from template</label>
            <select
              value={creatingFromTemplate}
              onChange={(e) => setCreatingFromTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">— Start blank —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({Array.isArray(t.questions) ? t.questions.length : 0} questions)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {templates.length === 0
                ? "No templates yet — you can create one from the Questionnaires page."
                : "You can edit the questions before sending."}
            </p>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowCreate(false); setError(null); }}
              disabled={busy}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="px-4 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit mode ──
  if (editing && questionnaire) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Questionnaire</h2>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intro (optional)</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              placeholder="Shown to the customer above the questions"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-y"
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Questions</h3>
        <QuestionEditor questions={editQuestions} onChange={setEditQuestions} />

        {error && (
          <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => { setEditing(false); setError(null); }}
            disabled={busy}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={busy}
            className="px-4 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── View mode ──
  if (!questionnaire) return null;
  const status = questionnaire.status;
  const answeredCount = Object.values(questionnaire.answers || {}).filter((v) => v !== "" && v !== null && v !== undefined).length;
  const totalCount = questionnaire.questions.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{questionnaire.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {totalCount} question{totalCount === 1 ? "" : "s"}
              {status !== "DRAFT" && status !== "SENT" && ` · ${answeredCount}/${totalCount} answered`}
            </span>
          </div>
        </div>
      </div>

      {questionnaire.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{questionnaire.description}</p>
      )}

      {questionnaire.sentAt && (
        <p className="text-xs text-gray-400 mb-3">
          Sent {new Date(questionnaire.sentAt).toLocaleString()}
          {questionnaire.submittedAt && ` · Submitted ${new Date(questionnaire.submittedAt).toLocaleString()}`}
        </p>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Answers preview */}
      {(status === "IN_PROGRESS" || status === "SUBMITTED") && totalCount > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAnswers((v) => !v)}
            className="text-xs font-semibold text-[#01358d] dark:text-blue-400 hover:underline"
          >
            {showAnswers ? "Hide" : "Show"} answers
          </button>
          {showAnswers && (
            <div className="mt-3 space-y-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4">
              {questionnaire.questions.map((q, idx) => (
                <div key={q.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-3 last:pb-0">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {idx + 1}. {q.label}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {formatAnswer(q, questionnaire.answers?.[q.id])}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {status === "DRAFT" && (
          <>
            <button
              onClick={handleSend}
              disabled={busy || doNotContact || totalCount === 0}
              className="px-4 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={doNotContact ? "Do Not Contact is enabled" : totalCount === 0 ? "Add questions first" : ""}
            >
              {busy ? "Sending…" : "Send to Customer"}
            </button>
            <button
              onClick={startEdit}
              disabled={busy}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="text-xs text-red-500 hover:text-red-700 transition ml-auto"
            >
              Delete
            </button>
          </>
        )}
        {(status === "SENT" || status === "IN_PROGRESS") && (
          <>
            <button
              onClick={handleSend}
              disabled={busy || doNotContact}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              title={doNotContact ? "Do Not Contact is enabled" : ""}
            >
              {busy ? "Resending…" : "Resend Email"}
            </button>
            <button
              onClick={startEdit}
              disabled={busy}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              title="Edit questions or wording. Customer's answers are preserved."
            >
              Edit
            </button>
          </>
        )}
        {status === "SUBMITTED" && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            All answered
          </p>
        )}
      </div>
    </div>
  );
}
