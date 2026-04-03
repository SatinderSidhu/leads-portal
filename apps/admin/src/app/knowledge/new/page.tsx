"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm";

const CATEGORIES = [
  "Getting Started",
  "Lead Management",
  "Email System",
  "SOW & Documents",
  "Integrations",
  "Settings",
  "Collaboration",
  "Sales Tools",
  "General",
];

export default function NewArticlePage() {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>}><NewArticleForm /></Suspense>;
}

function NewArticleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    category: "General",
  });

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/knowledge/${editId}`)
      .then((r) => r.json())
      .then((a) => {
        setForm({
          title: a.title || "",
          slug: a.slug || "",
          content: a.content || "",
          category: a.category || "General",
        });
      });
  }, [editId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (editId) return; // Don't auto-generate when editing
    setForm((f) => ({
      ...f,
      slug: f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  }, [form.title, editId]);

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      alert("Title and content are required");
      return;
    }
    setSaving(true);
    const url = editId ? `/api/knowledge/${editId}` : "/api/knowledge";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/knowledge/${data.slug || form.slug}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {editId ? "Edit Article" : "New Article"}
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. How to Create a Lead" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputClass} placeholder="auto-generated-from-title" />
            <p className="text-xs text-gray-400 mt-1">Used in the shareable URL: /knowledge/{form.slug || "..."}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content * (Markdown supported)</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={25}
          className={inputClass + " resize-y font-mono text-sm"}
          placeholder={`# Article Title

## Section Heading

Write your content here using Markdown:
- **Bold text** for emphasis
- \`inline code\` for commands
- Lists with dashes
- Tables with pipes

| Column 1 | Column 2 |
|----------|----------|
| Data | Data |`}
        />
        <p className="text-xs text-gray-400 mt-2">
          Supports: # headings, **bold**, *italic*, \`code\`, - lists, | tables |
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} className="bg-[#01358d] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition">
          {saving ? "Saving..." : editId ? "Save Changes" : "Publish Article"}
        </button>
        <button onClick={() => router.push("/knowledge")} className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}
