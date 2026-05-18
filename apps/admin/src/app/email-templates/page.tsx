"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PURPOSE_COLORS: Record<string, string> = {
  WELCOME: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FOLLOW_UP: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  REMINDER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  NOTIFICATION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PROMOTIONAL: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  NURTURE: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  COLD_OUTREACH: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const PURPOSE_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  FOLLOW_UP: "Follow Up",
  REMINDER: "Reminder",
  NOTIFICATION: "Notification",
  PROMOTIONAL: "Promotional",
  NURTURE: "Nurture",
  COLD_OUTREACH: "Cold Outreach",
  OTHER: "Other",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

const SYSTEM_KEY_LABELS: Record<string, { label: string; description: string; tags: string[] }> = {
  system_welcome: { label: "Welcome Email", description: "Sent when a new lead is created or welcome email is triggered", tags: ["customerName", "projectName", "portalUrl"] },
  system_status_update: { label: "Status Update", description: "Sent when project status changes", tags: ["customerName", "projectName", "statusLabel", "portalUrl"] },
  system_nda_ready: { label: "NDA Ready", description: "Sent when an NDA is shared with the customer", tags: ["customerName", "projectName", "ndaUrl"] },
  system_sow_ready: { label: "SOW Ready", description: "Sent when a Scope of Work is shared", tags: ["customerName", "projectName", "sowVersion", "sowUrl", "portalUrl"] },
  system_app_flow_ready: { label: "App Flow Ready", description: "Sent when an app flow is shared", tags: ["customerName", "projectName", "flowName", "flowUrl"] },
  system_sow_comment_reply: { label: "SOW Comment Reply", description: "Sent when admin replies to a SOW comment", tags: ["customerName", "projectName", "adminName", "commentContent", "sowUrl", "sowVersion"] },
  system_app_flow_comment_reply: { label: "App Flow Comment Reply", description: "Sent when admin replies to an app flow comment", tags: ["customerName", "projectName", "adminName", "commentContent", "flowUrl", "flowName"] },
  system_admin_message: { label: "Admin Message", description: "Sent when admin sends a message via chat", tags: ["customerName", "projectName", "adminName", "messageContent", "portalUrl"] },
  system_nda_signed: { label: "NDA Signed Confirmation", description: "Sent to customer when NDA is signed", tags: ["customerName", "projectName", "signerName", "signedDate", "portalUrl"] },
  system_sow_signed: { label: "SOW Signed Confirmation", description: "Sent to customer when SOW is approved and signed", tags: ["customerName", "projectName", "signerName", "signedDate", "sowVersion", "portalUrl"] },
};

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  purpose: string;
  sendAfterDays: number | null;
  tags: string[];
  systemKey: string | null;
  createdAt: string;
}

// Sample data for previewing system templates
const SAMPLE_DATA: Record<string, string> = {
  customerName: "Sarah Johnson",
  first_name: "Sarah",
  firstName: "Sarah",
  companyName: "Acme Corp",
  company_name: "Acme Corp",
  customerEmail: "sarah@acme.com",
  customerPhone: "+1 (555) 123-4567",
  customerCity: "New York",
  jobTitle: "Director of Product",
  stage: "Warm",
  source: "Cold Outreach",
  dateCreated: new Date().toLocaleDateString(),
  projectName: "Acme Mobile App",
  portalUrl: "https://leadsportal.kitlabs.us/project?id=sample",
  customerPortalUrl: "https://leadsportal.kitlabs.us?id=sample",
  bookMeetingUrl: "https://leadsportal.kitlabs.us/book?leadId=sample",
  statusLabel: "Design Ready",
  ndaUrl: "https://leadsportal.kitlabs.us/project?id=sample&tab=nda",
  sowUrl: "https://leadsportal.kitlabs.us/project?id=sample&tab=sow&v=2",
  sowVersion: "2",
  flowName: "User Onboarding Flow",
  flowUrl: "https://leadsportal.kitlabs.us/project?id=sample&tab=app-flow",
  adminName: "Satinder Sidhu",
  commentContent: "Great progress! I've reviewed the latest version and have a few minor suggestions. Let's discuss on our next call.",
  messageContent: "Hi Sarah! Just wanted to check in and see if you had a chance to review the latest SOW. Let me know if you have any questions.",
  signerName: "Sarah Johnson",
  signedDate: "April 5, 2026, 2:30 PM",
};

function mergeTags(text: string): string {
  let result = text;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

export default function EmailTemplatesListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compose" | "system">("compose");
  const [composeTemplates, setComposeTemplates] = useState<EmailTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; skipped: number } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  async function handleClone(tpl: EmailTemplate) {
    setCloning(tpl.id);
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${tpl.title} (Copy)`,
          subject: tpl.subject,
          body: tpl.body,
          tags: tpl.tags,
          purpose: tpl.purpose,
          sendAfterDays: tpl.sendAfterDays,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setComposeTemplates((prev) => [created, ...prev]);
      }
    } catch {
      // silently fail
    } finally {
      setCloning(null);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/email-templates?type=compose").then((r) => r.json()),
      fetch("/api/email-templates?type=system").then((r) => r.json()),
    ]).then(([compose, system]) => {
      if (Array.isArray(compose)) setComposeTemplates(compose);
      if (Array.isArray(system)) setSystemTemplates(system);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSeedSystemTemplates() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/email-templates/seed", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSeedResult(data);
        // Refresh the system templates list
        const refreshRes = await fetch("/api/email-templates?type=system");
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          if (Array.isArray(refreshed)) setSystemTemplates(refreshed);
        }
      }
    } catch {
      // silently fail
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
        {activeTab === "compose" ? (
          <button
            onClick={() => router.push("/email-templates/new")}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
          >
            + New Template
          </button>
        ) : (
          <button
            onClick={handleSeedSystemTemplates}
            disabled={seeding}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
            </svg>
            {seeding ? "Seeding..." : "Seed Default Templates"}
          </button>
        )}
      </div>

      {/* Seed Result Banner */}
      {seedResult && (
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {seedResult.created > 0
                ? `Created ${seedResult.created} system template${seedResult.created !== 1 ? "s" : ""}${seedResult.skipped > 0 ? ` (${seedResult.skipped} already existed)` : ""}`
                : `All ${seedResult.skipped} system templates already exist`}
            </p>
          </div>
          <button onClick={() => setSeedResult(null)} className="text-emerald-400 hover:text-emerald-600 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab("compose")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "compose"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Compose Templates
          {composeTemplates.length > 0 && (
            <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">{composeTemplates.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "system"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          System Templates
          {systemTemplates.length > 0 && (
            <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">{systemTemplates.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
      ) : activeTab === "system" ? (
        /* System Templates — Card Grid */
        systemTemplates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="text-gray-900 dark:text-white font-semibold mb-1">No system templates found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-5 max-w-sm mx-auto">System templates define the content of automated emails sent to customers. Click below to load the default templates.</p>
            <button
              onClick={handleSeedSystemTemplates}
              disabled={seeding}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
              </svg>
              {seeding ? "Seeding..." : "Load Default System Templates"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemTemplates.map((tpl) => {
              const meta = SYSTEM_KEY_LABELS[tpl.systemKey || ""] || { label: tpl.title, description: "", tags: [] };
              return (
                <div
                  key={tpl.id}
                  onClick={() => router.push(`/email-templates/${tpl.id}`)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <svg className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded">{tpl.systemKey}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">{meta.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{meta.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {meta.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] font-mono bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                        {`{{${tag}}}`}
                      </span>
                    ))}
                    {meta.tags.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{meta.tags.length - 4} more</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewTemplate(tpl); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      Preview
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/email-templates/${tpl.id}`); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Compose Templates — Table */
        composeTemplates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No compose templates yet</p>
            <button
              onClick={() => router.push("/email-templates/new")}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider max-w-xs">Preview</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delay</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {composeTemplates.map((template) => {
                    const bodySnippet = stripHtml(template.body);
                    return (
                    <tr
                      key={template.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                      onClick={() => router.push(`/email-templates/${template.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-teal-600">{template.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{template.subject}</td>
                      <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500 max-w-xs truncate" title={bodySnippet}>
                        {bodySnippet.length > 80 ? bodySnippet.slice(0, 80) + "..." : bodySnippet || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PURPOSE_COLORS[template.purpose] || "bg-gray-100 text-gray-800"}`}>
                          {PURPOSE_LABELS[template.purpose] || template.purpose}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {template.sendAfterDays != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                            Day {template.sendAfterDays}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag: string) => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(template.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClone(template); }}
                          disabled={cloning === template.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:text-teal-400 dark:hover:bg-teal-900/20 transition disabled:opacity-50"
                          title="Clone template"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email Preview</h3>
                  <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">{previewTemplate.systemKey}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rendered with sample data — this is how the email will look to customers</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Subject */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Subject</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{mergeTags(previewTemplate.subject)}</p>
            </div>

            {/* Sample Data Banner */}
            <div className="px-6 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                Sample data: <span className="font-mono">Sarah Johnson</span> / <span className="font-mono">Acme Mobile App</span> / <span className="font-mono">Satinder Sidhu</span>
              </p>
            </div>

            {/* Email Body Preview */}
            <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-6">
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <iframe
                  srcDoc={mergeTags(previewTemplate.body)}
                  className="w-full border-0"
                  style={{ minHeight: "400px" }}
                  title="Email Preview"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument) {
                      iframe.style.height = Math.max(400, iframe.contentDocument.body.scrollHeight + 20) + "px";
                    }
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex items-center justify-between">
              <button
                onClick={() => { setPreviewTemplate(null); router.push(`/email-templates/${previewTemplate.id}`); }}
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                </svg>
                Edit Template
              </button>
              <button onClick={() => setPreviewTemplate(null)} className="px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
