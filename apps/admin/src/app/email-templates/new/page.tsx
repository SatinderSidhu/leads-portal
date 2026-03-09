"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";
import RichTextEditor from "../../../components/RichTextEditor";
import EmailPreviewPanel from "../../../components/EmailPreviewPanel";
import TemplateTags from "../../../components/TemplateTags";
import TestEmailModal from "../../../components/TestEmailModal";

const PURPOSE_OPTIONS = [
  { value: "WELCOME", label: "Welcome" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "REMINDER", label: "Reminder" },
  { value: "NOTIFICATION", label: "Notification" },
  { value: "PROMOTIONAL", label: "Promotional" },
  { value: "OTHER", label: "Other" },
];

export default function NewEmailTemplatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [purpose, setPurpose] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);

  const isValid = title.trim() && subject.trim() && body.trim() && body !== "<p></p>";

  async function handleSubmit() {
    if (!isValid) return;
    setSaving(true);

    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          body,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          purpose,
          notes: notes.trim() || undefined,
        }),
      });

      if (res.ok) {
        router.push("/email-templates");
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
              onClick={() => router.push("/email-templates")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              New Email Template
            </h1>
          </div>
          <button
              onClick={() => setShowTestEmail(true)}
              disabled={!body.trim() || body === "<p></p>"}
              className="px-4 py-2 border border-teal-300 dark:border-teal-700 rounded-lg text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Send Test
            </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-6 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Welcome Email"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to {{company_name}}!"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body *
            </label>
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your email template content..."
            />
          </div>

          <TemplateTags />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                {PURPOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes about this template..."
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-y"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? "Creating..." : "Create Template"}
          </button>
        </div>

        {/* Email Preview - full width */}
        <div className="mt-8">
          <EmailPreviewPanel html={body} subject={subject} />
        </div>

        {showTestEmail && (
          <TestEmailModal
            subject={subject}
            html={body}
            onClose={() => setShowTestEmail(false)}
          />
        )}
      </main>
    </div>
  );
}
