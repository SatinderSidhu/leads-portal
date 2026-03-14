"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";

interface SowTemplate {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  projectType: string | null;
  durationRange: string | null;
  costRange: string | null;
  isDefault: boolean;
  fileName: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
}

export default function SowTemplatesListPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sow-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/sow-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => ({ ...t, isDefault: t.id === id }))
        );
      }
    } catch {
      alert("Failed to set default template");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/sow-templates/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      alert("Failed to delete template");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Dashboard
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              SOW Templates
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push("/sow-templates/new")}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              + New Template
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">
            Loading templates...
          </p>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No SOW templates yet
            </p>
            <button
              onClick={() => router.push("/sow-templates/new")}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border ${template.isDefault ? "border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/30" : "dark:border-gray-700"} p-6 flex flex-col`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3
                    className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                    onClick={() =>
                      router.push(`/sow-templates/${template.id}`)
                    }
                  >
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {template.fileName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        File
                      </span>
                    )}
                    {template.isDefault && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-4">
                  {template.industry && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {template.industry}
                    </span>
                  )}
                  {template.projectType && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {template.projectType}
                    </span>
                  )}
                  {template.durationRange && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {template.durationRange}
                    </span>
                  )}
                  {template.costRange && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {template.costRange}
                    </span>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t dark:border-gray-700 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </span>
                    {template.createdBy && (
                      <span className="text-xs text-gray-400">
                        by {template.createdBy}
                        {template.updatedBy && template.updatedBy !== template.createdBy && (
                          <span> (edited by {template.updatedBy})</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.isDefault && (
                      <button
                        onClick={() => handleSetDefault(template.id)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() =>
                        router.push(`/sow-templates/${template.id}`)
                      }
                      className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
