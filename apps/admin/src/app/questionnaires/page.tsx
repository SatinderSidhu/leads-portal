"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  description: string | null;
  questions: unknown[];
  updatedAt: string;
  updatedBy: string | null;
}

export default function QuestionnaireTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/questionnaire-templates", { cache: "no-store" });
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? Existing per-lead questionnaires using this template are unaffected.`)) return;
    const res = await fetch(`/api/questionnaire-templates/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const filtered = templates.filter((t) =>
    !search.trim() || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Questionnaire Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Reusable question sets for discovery, scoping, or post-project surveys. Apply to a lead from the lead detail page.
          </p>
        </div>
        <button
          onClick={() => router.push("/questionnaires/new")}
          className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
        >
          New Template
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search templates…"
        className="w-full max-w-md mb-6 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
      />

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {templates.length === 0 ? "No templates yet. Create your first one." : "No templates match that search."}
          </p>
          {templates.length === 0 && (
            <button
              onClick={() => router.push("/questionnaires/new")}
              className="px-5 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
            >
              New Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate flex-1">{t.name}</h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-[#01358d] dark:text-blue-400 px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0">
                  {Array.isArray(t.questions) ? t.questions.length : 0} {Array.isArray(t.questions) && t.questions.length === 1 ? "Q" : "Qs"}
                </span>
              </div>
              {t.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{t.description}</p>
              )}
              <p className="text-[11px] text-gray-400 mb-3">
                Updated {new Date(t.updatedAt).toLocaleDateString()}
                {t.updatedBy && ` by ${t.updatedBy}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/questionnaires/${t.id}`)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
