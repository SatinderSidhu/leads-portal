"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QuestionEditor, { Question } from "../../../components/QuestionEditor";

export default function EditTemplatePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/questionnaire-templates/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setName(data.name);
          setDescription(data.description || "");
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      setError("Every question needs a label");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/questionnaire-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, questions }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(error || "Failed to save");
      }
      router.push("/questionnaires");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.push("/questionnaires")} className="text-sm text-gray-500 hover:text-[#01358d] transition mb-4">
        &larr; Back to templates
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Template</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] resize-y"
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Questions</h2>
      <QuestionEditor questions={questions} onChange={setQuestions} />

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={() => router.push("/questionnaires")}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
