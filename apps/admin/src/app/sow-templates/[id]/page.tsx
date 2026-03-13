"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../../components/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    ),
  }
);

const PROJECT_TYPES = [
  "Web Application",
  "Mobile App",
  "Web + Mobile",
  "E-commerce",
  "SaaS Platform",
  "Landing Page / Marketing Site",
  "Custom Software",
  "API / Backend System",
];

interface SowTemplateData {
  id: string;
  name: string;
  description: string | null;
  content: string;
  industry: string | null;
  projectType: string | null;
  durationRange: string | null;
  costRange: string | null;
  isDefault: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditSowTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [industry, setIndustry] = useState("");
  const [projectType, setProjectType] = useState("");
  const [durationRange, setDurationRange] = useState("");
  const [costRange, setCostRange] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [meta, setMeta] = useState<{
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/sow-templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: SowTemplateData) => {
        setName(data.name);
        setDescription(data.description || "");
        setContent(data.content);
        setIndustry(data.industry || "");
        setProjectType(data.projectType || "");
        setDurationRange(data.durationRange || "");
        setCostRange(data.costRange || "");
        setIsDefault(data.isDefault);
        setMeta({
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      })
      .catch(() => {
        alert("Template not found");
        router.push("/sow-templates");
      })
      .finally(() => setLoading(false));
  }, [templateId, router]);

  const isValid = name.trim() && content.trim() && content !== "<p></p>";

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/sow-templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          content,
          industry: industry.trim() || null,
          projectType: projectType || null,
          durationRange: durationRange.trim() || null,
          costRange: costRange.trim() || null,
          isDefault,
        }),
      });

      if (res.ok) {
        alert("Template saved!");
        const updated = await res.json();
        setMeta({
          createdBy: updated.createdBy,
          updatedBy: updated.updatedBy,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save template");
      }
    } catch {
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/sow-templates/${templateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/sow-templates");
      } else {
        alert("Failed to delete template");
      }
    } catch {
      alert("Failed to delete template");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/sow-templates")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit SOW Template
              </h1>
              {meta && (
                <p className="text-xs text-gray-400">
                  Created{" "}
                  {new Date(meta.createdAt).toLocaleDateString()}
                  {meta.createdBy && ` by ${meta.createdBy}`}
                  {meta.updatedBy &&
                    ` · Updated by ${meta.updatedBy}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 text-sm font-medium transition"
            >
              Delete
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Form */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Template Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Standard Web App SOW"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief description of when to use this template..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare, Fintech"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  >
                    <option value="">Any</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration Range
                  </label>
                  <input
                    type="text"
                    value={durationRange}
                    onChange={(e) => setDurationRange(e.target.value)}
                    placeholder="e.g. 4-8 weeks"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Range
                  </label>
                  <input
                    type="text"
                    value={costRange}
                    onChange={(e) => setCostRange(e.target.value)}
                    placeholder="e.g. $10k - $25k"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as default template
                </span>
              </label>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Template Content *
                </h2>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Write the HTML structure/format for the SOW. The AI will follow
                this formatting when generating SOWs.
              </p>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your SOW template format here..."
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>

          {/* Right — Preview */}
          {showPreview && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 sticky top-8 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Preview
              </h2>
              {content && content !== "<p></p>" ? (
                <div
                  className="prose dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <p className="text-sm text-gray-400">
                  Start writing template content to see a preview...
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
