"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  tags: string[];
  notes: string | null;
  purpose: string;
  systemKey: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const SYSTEM_KEY_TAGS: Record<string, string[]> = {
  system_welcome: ["customerName", "projectName", "portalUrl"],
  system_status_update: ["customerName", "projectName", "statusLabel", "portalUrl"],
  system_nda_ready: ["customerName", "projectName", "ndaUrl"],
  system_sow_ready: ["customerName", "projectName", "sowVersion", "sowUrl", "portalUrl"],
  system_app_flow_ready: ["customerName", "projectName", "flowName", "flowUrl"],
  system_sow_comment_reply: ["customerName", "projectName", "adminName", "commentContent", "sowUrl", "sowVersion"],
  system_app_flow_comment_reply: ["customerName", "projectName", "adminName", "commentContent", "flowUrl", "flowName"],
  system_admin_message: ["customerName", "projectName", "adminName", "messageContent", "portalUrl"],
  system_nda_signed: ["customerName", "projectName", "signerName", "signedDate", "portalUrl"],
  system_sow_signed: ["customerName", "projectName", "signerName", "signedDate", "sowVersion", "portalUrl"],
};

export default function EditEmailTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [purpose, setPurpose] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);

  useEffect(() => {
    fetch(`/api/email-templates/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setTemplate(data);
        setTitle(data.title);
        setSubject(data.subject);
        setBody(data.body);
        setTags((data.tags || []).join(", "));
        setPurpose(data.purpose);
        setNotes(data.notes || "");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const isValid = title.trim() && subject.trim() && body.trim() && body !== "<p></p>";

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/email-templates/${params.id}`, {
        method: "PUT",
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
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        router.push("/email-templates");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update");
      }
    } catch {
      alert("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete template "${template?.title}"? This cannot be undone.`))
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email-templates/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/email-templates");
      } else {
        alert("Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Template not found</p>
      </div>
    );
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
              Edit Email Template
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
            {!template?.systemKey && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-6 max-w-3xl">
          {/* System template info banner */}
          {template?.systemKey && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">System Template</p>
                <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded">{template.systemKey}</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">This template is used automatically by the system. You can customize the subject and body content. Use the merge tags below in your template — they will be replaced with actual values when emails are sent.</p>
              <div className="flex flex-wrap gap-1.5">
                {(SYSTEM_KEY_TAGS[template.systemKey] || []).map((tag) => (
                  <span key={tag} className="text-xs font-mono bg-white dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-700 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800 transition" onClick={() => navigator.clipboard.writeText(`{{${tag}}}`)}>
                    {`{{${tag}}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="space-y-1">
              {template.createdBy && (
                <p>
                  Created by {template.createdBy} on{" "}
                  {new Date(template.createdAt).toLocaleString()}
                </p>
              )}
              {template.updatedBy && (
                <p>
                  Last updated by {template.updatedBy} on{" "}
                  {new Date(template.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? "Saving..." : "Save Changes"}
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
