"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../../components/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" /> }
);

const STATUS_OPTIONS = [
  "NEW",
  "DESIGN_READY",
  "DESIGN_APPROVED",
  "BUILD_IN_PROGRESS",
  "BUILD_READY_FOR_REVIEW",
  "BUILD_SUBMITTED",
  "GO_LIVE",
] as const;

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  DESIGN_READY: "bg-yellow-100 text-yellow-800",
  DESIGN_APPROVED: "bg-green-100 text-green-800",
  BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800",
  BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800",
  GO_LIVE: "bg-emerald-100 text-emerald-800",
};

const STAGE_OPTIONS = ["COLD", "WARM", "HOT", "ACTIVE", "CLOSED"] as const;

const STAGE_LABELS: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

const STAGE_COLORS: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-800",
  WARM: "bg-yellow-100 text-yellow-800",
  HOT: "bg-orange-100 text-orange-800",
  ACTIVE: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const EMAIL_STATUS_COLORS: Record<string, string> = {
  SENT: "bg-blue-100 text-blue-800",
  OPENED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

interface Note {
  id: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface StatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  createdAt: string;
}

interface Nda {
  id: string;
  status: string;
  signerName: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface SentEmail {
  id: string;
  subject: string;
  status: string;
  sentBy: string | null;
  openedAt: string | null;
  createdAt: string;
  template: { title: string; purpose: string } | null;
}

interface EmailTemplateItem {
  id: string;
  title: string;
  subject: string;
  body: string;
  purpose: string;
}

interface Recommendation {
  templateId: string;
  templateTitle: string;
  templateSubject: string;
  purpose: string;
  flowName: string;
  edgeLabel: string | null;
  fromTemplateName: string;
}

const NDA_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  GENERATED: { label: "Generated", color: "bg-yellow-100 text-yellow-800" },
  SENT: { label: "Sent to Customer", color: "bg-blue-100 text-blue-800" },
  SIGNED: { label: "Signed", color: "bg-green-100 text-green-800" },
};

interface Lead {
  id: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  projectDescription: string;
  source: string;
  status: string;
  stage: string;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  emailSent: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
  statusHistory: StatusHistoryEntry[];
  nda: Nda | null;
  sentEmails: SentEmail[];
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [noteContent, setNoteContent] = useState("");
  const [noteAdding, setNoteAdding] = useState(false);
  const [ndaGenerating, setNdaGenerating] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editStage, setEditStage] = useState("COLD");
  const [editLinkedin, setEditLinkedin] = useState("");
  const [editFacebook, setEditFacebook] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Email compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTemplateId, setComposeTemplateId] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);

  const [includeSignature, setIncludeSignature] = useState(false);
  const [adminSignature, setAdminSignature] = useState<string | null>(null);

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const fetchLead = useCallback(async () => {
    const res = await fetch(`/api/leads/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data);
      setNewStatus(data.status);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Load templates for compose
  useEffect(() => {
    fetch("/api/email-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      });
  }, []);

  // Load admin signature
  useEffect(() => {
    fetch("/api/admin-users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.emailSignature) setAdminSignature(data.emailSignature);
      });
  }, []);

  // Load recommendations
  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/leads/${params.id}/recommendations`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRecommendations(data);
      });
  }, [params.id, lead?.sentEmails?.length]);

  function startEditing() {
    if (!lead) return;
    setEditProjectName(lead.projectName);
    setEditCustomerName(lead.customerName);
    setEditCustomerEmail(lead.customerEmail);
    setEditProjectDescription(lead.projectDescription);
    setEditStage(lead.stage || "COLD");
    setEditLinkedin(lead.linkedinUrl || "");
    setEditFacebook(lead.facebookUrl || "");
    setEditTwitter(lead.twitterUrl || "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!lead) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: editProjectName.trim(),
          customerName: editCustomerName.trim(),
          customerEmail: editCustomerEmail.trim(),
          projectDescription: editProjectDescription.trim(),
          stage: editStage,
          linkedinUrl: editLinkedin.trim() || null,
          facebookUrl: editFacebook.trim() || null,
          twitterUrl: editTwitter.trim() || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save changes");
      }
    } catch {
      alert("Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (
      !confirm(
        `Are you sure you want to delete "${lead.projectName}"? This action cannot be undone and will remove all associated notes, status history, and NDA.`
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete lead");
      }
    } catch {
      alert("Failed to delete lead");
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusUpdate() {
    if (!lead || newStatus === lead.status) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, sendEmail: notifyCustomer }),
      });
      if (res.ok) {
        setNotifyCustomer(false);
        await fetchLead();
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAddNote() {
    if (!lead || !noteContent.trim()) return;
    setNoteAdding(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (res.ok) {
        setNoteContent("");
        await fetchLead();
      }
    } catch {
      alert("Failed to add note");
    } finally {
      setNoteAdding(false);
    }
  }

  async function handleGenerateNda() {
    if (!lead) return;
    setNdaGenerating(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/nda`, { method: "POST" });
      if (res.ok) {
        router.push(`/leads/${lead.id}/nda`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate NDA");
      }
    } catch {
      alert("Failed to generate NDA");
    } finally {
      setNdaGenerating(false);
    }
  }

  function handleTemplateSelect(templateId: string) {
    setComposeTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setComposeSubject(template.subject);
      setComposeBody(template.body);
    }
  }

  function loadRecommendation(rec: Recommendation) {
    const template = templates.find((t) => t.id === rec.templateId);
    if (template) {
      setComposeTemplateId(template.id);
      setComposeSubject(template.subject);
      setComposeBody(template.body);
    } else {
      setComposeSubject(rec.templateSubject);
      setComposeBody("");
    }
    setComposeOpen(true);
  }

  async function handleSendEmail() {
    if (!lead || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          templateId: composeTemplateId || undefined,
          includeSignature,
        }),
      });
      if (res.ok) {
        setComposeOpen(false);
        setComposeSubject("");
        setComposeBody("");
        setComposeTemplateId("");
        setIncludeSignature(false);
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send email");
      }
    } catch {
      alert("Failed to send email");
    } finally {
      setComposeSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Lead not found</p>
      </div>
    );
  }

  const editValid =
    editProjectName.trim() &&
    editCustomerName.trim() &&
    editCustomerEmail.trim() &&
    editProjectDescription.trim();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {lead.projectName}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-800"}`}
            >
              {STATUS_LABELS[lead.status] || lead.status}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || "bg-gray-100 text-gray-800"}`}
            >
              {STAGE_LABELS[lead.stage] || lead.stage}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {!editing && (
              <button
                onClick={startEditing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Project Details
                </h2>
                {editing && (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editValid || editSaving}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {editSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        value={editCustomerEmail}
                        onChange={(e) => setEditCustomerEmail(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Description
                    </label>
                    <textarea
                      value={editProjectDescription}
                      onChange={(e) =>
                        setEditProjectDescription(e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>

                  {/* Stage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lead Stage
                    </label>
                    <select
                      value={editStage}
                      onChange={(e) => setEditStage(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    >
                      {STAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Social Links */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        value={editLinkedin}
                        onChange={(e) => setEditLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        value={editFacebook}
                        onChange={(e) => setEditFacebook(e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Twitter URL
                      </label>
                      <input
                        type="url"
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        placeholder="https://twitter.com/..."
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer Name
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {lead.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer Email
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {lead.customerEmail}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Source
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.source === "AGENT" ? "bg-cyan-100 text-cyan-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {lead.source === "AGENT" ? "Agent" : "Manual"}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Stage
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || "bg-gray-100 text-gray-800"}`}
                        >
                          {STAGE_LABELS[lead.stage] || lead.stage}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Created
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Welcome Email
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {lead.emailSent ? "Sent" : "Not sent"}
                      </p>
                    </div>
                  </div>

                  {/* Social Links */}
                  {(lead.linkedinUrl || lead.facebookUrl || lead.twitterUrl) && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                        >
                          LinkedIn
                        </a>
                      )}
                      {lead.facebookUrl && (
                        <a
                          href={lead.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                        >
                          Facebook
                        </a>
                      )}
                      {lead.twitterUrl && (
                        <a
                          href={lead.twitterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                        >
                          Twitter
                        </a>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Project Description
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {lead.projectDescription}
                    </p>
                  </div>

                  {/* Audit Info */}
                  {(lead.createdBy || lead.updatedBy) && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-6 gap-y-1">
                      {lead.createdBy && (
                        <p className="text-xs text-gray-400">
                          Created by{" "}
                          <span className="font-medium text-gray-500 dark:text-gray-300">
                            {lead.createdBy}
                          </span>{" "}
                          on {new Date(lead.createdAt).toLocaleString()}
                        </p>
                      )}
                      {lead.updatedBy && (
                        <p className="text-xs text-gray-400">
                          Last updated by{" "}
                          <span className="font-medium text-gray-500 dark:text-gray-300">
                            {lead.updatedBy}
                          </span>{" "}
                          on {new Date(lead.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Email Compose */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Send Email
                </h2>
                {!composeOpen && (
                  <button
                    onClick={() => setComposeOpen(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
                  >
                    Compose Email
                  </button>
                )}
              </div>

              {composeOpen && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Use Template
                    </label>
                    <select
                      value={composeTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    >
                      <option value="">-- No template (blank) --</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      To
                    </label>
                    <input
                      type="text"
                      value={lead.customerEmail}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Body *
                    </label>
                    <RichTextEditor
                      content={composeBody}
                      onChange={setComposeBody}
                      placeholder="Compose your email..."
                    />
                  </div>

                  {/* Signature checkbox */}
                  {adminSignature && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSignature}
                          onChange={(e) => setIncludeSignature(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include email signature
                        </span>
                      </label>
                      {includeSignature && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-400 mb-1">Signature preview:</p>
                          <div
                            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: adminSignature }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSendEmail}
                      disabled={!composeSubject.trim() || !composeBody.trim() || composeSending}
                      className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {composeSending ? "Sending..." : "Send Email"}
                    </button>
                    <button
                      onClick={() => {
                        setComposeOpen(false);
                        setComposeSubject("");
                        setComposeBody("");
                        setComposeTemplateId("");
                        setIncludeSignature(false);
                      }}
                      className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Next Email */}
            {recommendations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recommended Next Email
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.map((rec) => (
                    <button
                      key={rec.templateId}
                      onClick={() => loadRecommendation(rec)}
                      className="text-left p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {rec.templateTitle}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {rec.templateSubject}
                      </div>
                      <div className="text-xs text-teal-600 dark:text-teal-400 mt-2">
                        {rec.edgeLabel
                          ? `After: ${rec.fromTemplateName} → ${rec.edgeLabel}`
                          : `From flow: ${rec.flowName}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Audit Log */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Email History
              </h2>

              {lead.sentEmails.length === 0 ? (
                <p className="text-gray-400 text-sm">No emails sent yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Subject
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Template
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Sent By
                        </th>
                        <th className="text-left pb-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {lead.sentEmails.map((email) => (
                        <tr key={email.id}>
                          <td className="py-3 text-sm text-gray-900 dark:text-white">
                            {email.subject}
                          </td>
                          <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                            {email.template?.title || "—"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EMAIL_STATUS_COLORS[email.status] || "bg-gray-100 text-gray-800"}`}
                            >
                              {email.status}
                            </span>
                            {email.openedAt && (
                              <span className="text-xs text-gray-400 ml-1">
                                {new Date(email.openedAt).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                            {email.sentBy || "—"}
                          </td>
                          <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(email.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notes
              </h2>

              <div className="flex gap-3 mb-6">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || noteAdding}
                  className="self-end bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {noteAdding ? "Adding..." : "Add Note"}
                </button>
              </div>

              {lead.notes.length === 0 ? (
                <p className="text-gray-400 text-sm">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {lead.notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600"
                    >
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {note.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {note.createdBy && (
                          <span className="font-medium">{note.createdBy} &middot; </span>
                        )}
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Status
              </h2>

              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-3 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notify Customer
                </span>
              </label>

              <button
                onClick={handleStatusUpdate}
                disabled={newStatus === lead.status || statusUpdating}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {statusUpdating ? "Updating..." : "Update Status"}
              </button>
            </div>

            {/* Status History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Status History
              </h2>

              {lead.statusHistory.length === 0 ? (
                <p className="text-gray-400 text-sm">No history yet</p>
              ) : (
                <div className="space-y-0">
                  {lead.statusHistory.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${index === 0 ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                        />
                        {index < lead.statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-600 min-h-[32px]" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                        </p>
                        <p className="text-xs text-gray-400">
                          {entry.changedBy && (
                            <span className="font-medium">{entry.changedBy} &middot; </span>
                          )}
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NDA */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Non-Disclosure Agreement
              </h2>

              {!lead.nda ? (
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    No NDA has been generated for this lead yet.
                  </p>
                  <button
                    onClick={handleGenerateNda}
                    disabled={ndaGenerating}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {ndaGenerating ? "Generating..." : "Generate NDA"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Status
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${NDA_STATUS_DISPLAY[lead.nda.status]?.color || "bg-gray-100 text-gray-800"}`}
                    >
                      {NDA_STATUS_DISPLAY[lead.nda.status]?.label ||
                        lead.nda.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Created
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(lead.nda.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {lead.nda.status === "SIGNED" && lead.nda.signerName && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Signed By
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium">
                          {lead.nda.signerName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Signed On
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {lead.nda.signedAt
                            ? new Date(lead.nda.signedAt).toLocaleString()
                            : "\u2014"}
                        </span>
                      </div>
                    </>
                  )}
                  <button
                    onClick={() => router.push(`/leads/${lead.id}/nda`)}
                    className="w-full mt-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    View NDA
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
