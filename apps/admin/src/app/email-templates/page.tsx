"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PURPOSE_COLORS: Record<string, string> = {
  WELCOME: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  FOLLOW_UP: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  REMINDER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  NOTIFICATION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PROMOTIONAL: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const PURPOSE_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  FOLLOW_UP: "Follow Up",
  REMINDER: "Reminder",
  NOTIFICATION: "Notification",
  PROMOTIONAL: "Promotional",
  OTHER: "Other",
};

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
  purpose: string;
  tags: string[];
  systemKey: string | null;
  createdAt: string;
}

export default function EmailTemplatesListPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"compose" | "system">("compose");
  const [composeTemplates, setComposeTemplates] = useState<EmailTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/email-templates?type=compose").then((r) => r.json()),
      fetch("/api/email-templates?type=system").then((r) => r.json()),
    ]).then(([compose, system]) => {
      if (Array.isArray(compose)) setComposeTemplates(compose);
      if (Array.isArray(system)) setSystemTemplates(system);
    }).finally(() => setLoading(false));
  }, []);

  const templates = activeTab === "compose" ? composeTemplates : systemTemplates;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
        {activeTab === "compose" && (
          <button
            onClick={() => router.push("/email-templates/new")}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
          >
            + New Template
          </button>
        )}
      </div>

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
            <p className="text-gray-500 dark:text-gray-400 mb-2">No system templates found.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">System templates are created automatically when the database is seeded.</p>
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
                  <div className="flex flex-wrap gap-1">
                    {meta.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] font-mono bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">
                        {`{{${tag}}}`}
                      </span>
                    ))}
                    {meta.tags.length > 4 && (
                      <span className="text-[10px] text-gray-400">+{meta.tags.length - 4} more</span>
                    )}
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {composeTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                      onClick={() => router.push(`/email-templates/${template.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-teal-600">{template.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{template.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PURPOSE_COLORS[template.purpose] || "bg-gray-100 text-gray-800"}`}>
                          {PURPOSE_LABELS[template.purpose] || template.purpose}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag: string) => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(template.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
