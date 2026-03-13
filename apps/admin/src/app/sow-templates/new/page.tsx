"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewSowTemplatePage() {
  const router = useRouter();
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

  const isValid = name.trim() && content.trim() && content !== "<p></p>";

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);

    try {
      const res = await fetch("/api/sow-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          content,
          industry: industry.trim() || undefined,
          projectType: projectType || undefined,
          durationRange: durationRange.trim() || undefined,
          costRange: costRange.trim() || undefined,
          isDefault,
        }),
      });

      if (res.ok) {
        router.push("/sow-templates");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create template");
      }
    } catch {
      alert("Failed to create template");
    } finally {
      setSaving(false);
    }
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              New SOW Template
            </h1>
          </div>
          <ThemeToggle />
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
                this formatting when generating SOWs. Include section headings,
                layout patterns, and any boilerplate text.
              </p>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your SOW template format here... Include sections like Executive Summary, Scope of Work, Timeline, Terms & Conditions, etc."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isValid || saving}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Creating..." : "Create Template"}
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
