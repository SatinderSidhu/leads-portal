"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../../components/RichTextEditor"),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" /> }
);

const STATUS_OPTIONS = [
  "NEW",
  "SOW_READY",
  "SOW_SIGNED",
  "APP_FLOW_READY",
  "DESIGN_READY",
  "DESIGN_APPROVED",
  "BUILD_IN_PROGRESS",
  "BUILD_READY_FOR_REVIEW",
  "BUILD_SUBMITTED",
  "GO_LIVE",
  "LOST",
  "NO_RESPONSE",
  "ON_HOLD",
  "CANCELLED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SOW_READY: "SOW Ready",
  SOW_SIGNED: "SOW Signed",
  APP_FLOW_READY: "App Flow Ready",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
  LOST: "Lost",
  NO_RESPONSE: "No Response",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  SOW_READY: "bg-cyan-100 text-cyan-800",
  SOW_SIGNED: "bg-cyan-100 text-cyan-800",
  APP_FLOW_READY: "bg-teal-100 text-teal-800",
  DESIGN_READY: "bg-yellow-100 text-yellow-800",
  DESIGN_APPROVED: "bg-green-100 text-green-800",
  BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800",
  BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800",
  GO_LIVE: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
  NO_RESPONSE: "bg-gray-100 text-gray-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STAGE_OPTIONS = ["NEW", "COLD", "WARM", "HOT", "CONTACTED", "RESPONDED", "MEETING_BOOKED", "QUALIFIED", "DISQUALIFIED", "NURTURE", "ACTIVE", "CLOSED"] as const;

const STAGE_LABELS: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
  ACTIVE: "Active",
  CLOSED: "Closed",
  NEW: "New",
  CONTACTED: "Contacted",
  RESPONDED: "Responded",
  MEETING_BOOKED: "Meeting Booked",
  QUALIFIED: "Qualified",
  DISQUALIFIED: "Disqualified",
  NURTURE: "Nurture",
};

const STAGE_COLORS: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-800",
  WARM: "bg-yellow-100 text-yellow-800",
  HOT: "bg-orange-100 text-orange-800",
  ACTIVE: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
  NEW: "bg-sky-100 text-sky-800",
  CONTACTED: "bg-indigo-100 text-indigo-800",
  RESPONDED: "bg-violet-100 text-violet-800",
  MEETING_BOOKED: "bg-emerald-100 text-emerald-800",
  QUALIFIED: "bg-green-100 text-green-800",
  DISQUALIFIED: "bg-red-100 text-red-800",
  NURTURE: "bg-amber-100 text-amber-800",
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

interface EmailAttachmentItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
}

interface SentEmail {
  id: string;
  subject: string;
  body: string;
  status: string;
  sentBy: string | null;
  openedAt: string | null;
  cc: string | null;
  bcc: string | null;
  replyToEmailId: string | null;
  replyToType: string | null;
  createdAt: string;
  template: { title: string; purpose: string } | null;
  attachments: EmailAttachmentItem[];
}

interface ReceivedEmail {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: string;
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
  phone: string | null;
  city: string | null;
  zip: string | null;
  dateCreated: string | null;
  emailSent: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  zohoLeadId: string | null;
  doNotContact: boolean;
  jobTitle: string | null;
  companyName: string | null;
  location: string | null;
  industry: string | null;
  companySize: string | null;
  companyWebsite: string | null;
  extractedDate: string | null;
  lastContactedDate: string | null;
  leadScore: number | null;
  connectionRequestSent: boolean;
  connectionAccepted: boolean;
  initialMessageSent: boolean;
  meetingBooked: boolean;
  meetingDate: string | null;
  responseReceived: boolean;
  notes: Note[];
  statusHistory: StatusHistoryEntry[];
  nda: Nda | null;
  sentEmails: SentEmail[];
  receivedEmails: ReceivedEmail[];
  files: LeadFileItem[];
  assignedTo?: { id: string; name: string; email: string } | null;
  watchers?: { admin: { id: string; name: string; email: string } }[];
}

interface LeadFileItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string | null;
  createdAt: string;
}

interface SowItem {
  id: string;
  version: number;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  fileType: string | null;
  content: string | null;
  isDraft: boolean;
  comments: string | null;
  uploadedBy: string | null;
  sharedAt: string | null;
  sharedBy: string | null;
  createdAt: string;
}

interface AppFlowItem {
  id: string;
  name: string;
  flowType: string;
  sharedAt: string | null;
  sharedBy: string | null;
  createdAt: string;
  _count?: { comments: number };
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
  // Next steps state
  const [nextSteps, setNextSteps] = useState<{ id: string; content: string; dueDate: string | null; completed: boolean; completedAt: string | null; createdBy: string | null; createdAt: string }[]>([]);
  const [nextStepContent, setNextStepContent] = useState("");
  const [nextStepDueDate, setNextStepDueDate] = useState("");
  const [nextStepAdding, setNextStepAdding] = useState(false);
  // Audit log state
  const [auditLogs, setAuditLogs] = useState<{ id: string; action: string; detail: string | null; actor: string | null; createdAt: string }[]>([]);
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
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editDateCreated, setEditDateCreated] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editCompanySize, setEditCompanySize] = useState("");
  const [editCompanyWebsite, setEditCompanyWebsite] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // File upload state
  const [fileUploading, setFileUploading] = useState(false);

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
  const [previewOpen, setPreviewOpen] = useState(false);

  // CC/BCC
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Attachments
  const [composeAttachments, setComposeAttachments] = useState<File[]>([]);

  // Reply mode
  const [replyMode, setReplyMode] = useState(false);
  const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null);
  const [replyToType, setReplyToType] = useState<string | null>(null);

  // Thread state
  const [threadCollapsed, setThreadCollapsed] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // SOW state
  const [sows, setSows] = useState<SowItem[]>([]);
  const [sowUploading, setSowUploading] = useState(false);
  const [sowComments, setSowComments] = useState("");
  const [sowSharing, setSowSharing] = useState<string | null>(null);

  // App Flow state
  const [appFlows, setAppFlows] = useState<AppFlowItem[]>([]);
  const [appFlowSharing, setAppFlowSharing] = useState<string | null>(null);

  // Zoho state
  const [zohoEnabled, setZohoEnabled] = useState(false);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [zohoUrl, setZohoUrl] = useState<string | null>(null);
  const [zohoFound, setZohoFound] = useState<boolean | null>(null);
  const [zohoCreating, setZohoCreating] = useState(false);
  const [zohoSyncing, setZohoSyncing] = useState(false);
  const [zohoSyncResult, setZohoSyncResult] = useState<{
    direction: string;
    message: string;
    changes?: { field: string; from: string | null; to: string | null }[];
  } | null>(null);

  // Welcome email state
  const [sendingWelcome, setSendingWelcome] = useState(false);

  // Assignment & watch state
  const [adminUsers, setAdminUsers] = useState<{ id: string; name: string; email: string; active: boolean }[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [watchToggling, setWatchToggling] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [currentAdminName, setCurrentAdminName] = useState<string | null>(null);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

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

  // Load admin signature + current admin ID
  useEffect(() => {
    fetch("/api/admin-users/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.emailSignature) setAdminSignature(data.emailSignature);
        if (data.id) setCurrentAdminId(data.id);
        if (data.name) setCurrentAdminName(data.name);
      });
  }, []);

  // Load admin users for assignment dropdown
  useEffect(() => {
    fetch("/api/admin-users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAdminUsers(data);
      })
      .catch(() => {});
  }, []);

  // Update watcher state when lead data changes
  useEffect(() => {
    if (!lead || !currentAdminId) return;
    const watchers = lead.watchers || [];
    setWatcherCount(watchers.length);
    setIsWatching(watchers.some((w) => w.admin.id === currentAdminId));
  }, [lead, currentAdminId]);

  // Check Zoho status when lead loads
  useEffect(() => {
    if (!lead) return;
    setZohoLoading(true);
    fetch(`/api/zoho/search-lead?leadId=${lead.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.zohoEnabled !== undefined) setZohoEnabled(data.zohoEnabled !== false);
        if (data.found) {
          setZohoFound(true);
          setZohoUrl(data.zohoUrl || null);
        } else {
          setZohoFound(false);
          setZohoUrl(null);
        }
      })
      .catch(() => {})
      .finally(() => setZohoLoading(false));
  }, [lead?.id, lead?.zohoLeadId]);

  // Load recommendations
  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/leads/${params.id}/recommendations`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRecommendations(data);
      });
  }, [params.id, lead?.sentEmails?.length]);

  // Load Next Steps
  const fetchNextSteps = useCallback(async () => {
    if (!params.id) return;
    const res = await fetch(`/api/leads/${params.id}/next-steps`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setNextSteps(data);
    }
  }, [params.id]);

  useEffect(() => {
    fetchNextSteps();
  }, [fetchNextSteps]);

  // Load Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!params.id) return;
    const res = await fetch(`/api/leads/${params.id}/audit`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAuditLogs(data);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Load SOWs
  const fetchSows = useCallback(async () => {
    if (!params.id) return;
    const res = await fetch(`/api/leads/${params.id}/sow?includeDrafts=true`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setSows(data);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSows();
  }, [fetchSows]);

  // Load App Flows
  const fetchAppFlows = useCallback(async () => {
    if (!params.id) return;
    const res = await fetch(`/api/leads/${params.id}/app-flows`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setAppFlows(data);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAppFlows();
  }, [fetchAppFlows]);

  async function handleShareAppFlow(flowId: string) {
    if (!lead) return;
    setAppFlowSharing(flowId);
    try {
      const res = await fetch(`/api/leads/${lead.id}/app-flows/${flowId}/share`, {
        method: "POST",
      });
      if (res.ok) {
        fetchAppFlows();
        fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to share app flow");
      }
    } catch {
      alert("Failed to share app flow");
    } finally {
      setAppFlowSharing(null);
    }
  }

  async function handleDeleteAppFlow(flowId: string) {
    if (!lead || !confirm("Are you sure you want to delete this app flow?")) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/app-flows/${flowId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAppFlows();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete app flow");
      }
    } catch {
      alert("Failed to delete app flow");
    }
  }

  async function handleAssign(adminId: string) {
    if (!lead) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: adminId }),
      });
      if (res.ok) {
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign lead");
      }
    } catch {
      alert("Failed to assign lead");
    } finally {
      setAssigning(false);
    }
  }

  async function handleToggleWatch() {
    if (!lead) return;
    setWatchToggling(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/watch`, {
        method: isWatching ? "DELETE" : "POST",
      });
      if (res.ok) {
        await fetchLead();
      }
    } catch {
      // Silently fail
    } finally {
      setWatchToggling(false);
    }
  }

  async function handleCreateInZoho() {
    if (!lead) return;
    setZohoCreating(true);
    try {
      const res = await fetch("/api/zoho/create-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setZohoFound(true);
        setZohoUrl(data.zohoUrl || null);
        await fetchLead();
      } else {
        alert(data.error || "Failed to create lead in Zoho");
      }
    } catch {
      alert("Failed to create lead in Zoho");
    } finally {
      setZohoCreating(false);
    }
  }

  async function handleSyncWithZoho() {
    if (!lead) return;
    setZohoSyncing(true);
    setZohoSyncResult(null);
    try {
      const res = await fetch("/api/zoho/sync-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setZohoSyncResult(data);
        if (data.zohoUrl) setZohoUrl(data.zohoUrl);
        if (data.direction === "zoho_to_portal") {
          await fetchLead();
        }
        // Auto-dismiss after 10s (5s for "already in sync")
        setTimeout(() => setZohoSyncResult(null), data.direction === "none" ? 5000 : 10000);
      } else {
        alert(data.error || "Failed to sync with Zoho");
      }
    } catch {
      alert("Failed to sync with Zoho");
    } finally {
      setZohoSyncing(false);
    }
  }

  async function handleToggleDoNotContact() {
    if (!lead) return;
    const newValue = !lead.doNotContact;
    if (lead.doNotContact && !confirm("Are you sure you want to disable Do Not Contact? This will allow emails to be sent to this customer again.")) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doNotContact: newValue }),
      });
      if (res.ok) {
        await fetchLead();
        fetchAuditLogs();
      }
    } catch {
      alert("Failed to update Do Not Contact flag");
    }
  }

  async function handleSendWelcomeEmail() {
    if (!lead) return;
    setSendingWelcome(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/welcome-email`, { method: "POST" });
      if (res.ok) {
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send welcome email");
      }
    } catch {
      alert("Failed to send welcome email");
    } finally {
      setSendingWelcome(false);
    }
  }

  async function handleSowUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lead) return;
    setSowUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (sowComments.trim()) formData.append("comments", sowComments.trim());
      const res = await fetch(`/api/leads/${lead.id}/sow`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setSowComments("");
        await fetchSows();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload SOW");
      }
    } catch {
      alert("Failed to upload SOW");
    } finally {
      setSowUploading(false);
      e.target.value = "";
    }
  }

  async function handleShareSow(sowId: string) {
    if (!lead) return;
    setSowSharing(sowId);
    try {
      const res = await fetch(`/api/leads/${lead.id}/sow/${sowId}/share`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchSows();
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to share SOW");
      }
    } catch {
      alert("Failed to share SOW");
    } finally {
      setSowSharing(null);
    }
  }

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
    setEditPhone(lead.phone || "");
    setEditCity(lead.city || "");
    setEditZip(lead.zip || "");
    setEditDateCreated(lead.dateCreated ? lead.dateCreated.slice(0, 10) : "");
    setEditJobTitle(lead.jobTitle || "");
    setEditCompanyName(lead.companyName || "");
    setEditLocation(lead.location || "");
    setEditIndustry(lead.industry || "");
    setEditCompanySize(lead.companySize || "");
    setEditCompanyWebsite(lead.companyWebsite || "");
    setEditSource(lead.source || "MANUAL");
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
          phone: editPhone.trim() || null,
          city: editCity.trim() || null,
          zip: editZip.trim() || null,
          dateCreated: editDateCreated || null,
          jobTitle: editJobTitle.trim() || null,
          companyName: editCompanyName.trim() || null,
          location: editLocation.trim() || null,
          industry: editIndustry.trim() || null,
          companySize: editCompanySize.trim() || null,
          companyWebsite: editCompanyWebsite.trim() || null,
          source: editSource,
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
        fetchAuditLogs();
      }
    } catch {
      alert("Failed to add note");
    } finally {
      setNoteAdding(false);
    }
  }

  async function handleEditNote(noteId: string, content: string) {
    if (!lead || !content.trim()) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, content: content.trim() }),
      });
      if (res.ok) {
        setEditingNoteId(null);
        setEditingNoteContent("");
        await fetchLead();
        fetchAuditLogs();
      }
    } catch {
      alert("Failed to update note");
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!lead || !confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes?noteId=${noteId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchLead();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete note");
      }
    } catch {
      alert("Failed to delete note");
    }
  }

  async function handleAddNextStep() {
    if (!lead || !nextStepContent.trim()) return;
    setNextStepAdding(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/next-steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextStepContent.trim(), dueDate: nextStepDueDate || null }),
      });
      if (res.ok) {
        setNextStepContent("");
        setNextStepDueDate("");
        fetchNextSteps();
        fetchAuditLogs();
      }
    } catch {
      alert("Failed to add next step");
    } finally {
      setNextStepAdding(false);
    }
  }

  async function handleToggleNextStep(stepId: string, completed: boolean) {
    try {
      await fetch(`/api/leads/${lead!.id}/next-steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, completed }),
      });
      fetchNextSteps();
      fetchAuditLogs();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteNextStep(stepId: string) {
    if (!confirm("Delete this next step?")) return;
    try {
      await fetch(`/api/leads/${lead!.id}/next-steps?stepId=${stepId}`, { method: "DELETE" });
      fetchNextSteps();
      fetchAuditLogs();
    } catch {
      // silently fail
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

  function mergeTags(text: string): string {
    if (!lead) return text;
    const statusLabel = STATUS_LABELS[lead.status] || lead.status;
    const stageLabel = STAGE_LABELS[lead.stage] || lead.stage;
    const dateLabel = lead.dateCreated
      ? new Date(lead.dateCreated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "";
    return text
      .replace(/\{\{customerName\}\}/g, lead.customerName)
      .replace(/\{\{projectName\}\}/g, lead.projectName)
      .replace(/\{\{customerEmail\}\}/g, lead.customerEmail)
      .replace(/\{\{customerPhone\}\}/g, lead.phone || "")
      .replace(/\{\{customerCity\}\}/g, lead.city || "")
      .replace(/\{\{status\}\}/g, statusLabel)
      .replace(/\{\{stage\}\}/g, stageLabel)
      .replace(/\{\{source\}\}/g, lead.source || "")
      .replace(/\{\{dateCreated\}\}/g, dateLabel);
  }

  function handleTemplateSelect(templateId: string) {
    setComposeTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setComposeSubject(mergeTags(template.subject));
      setComposeBody(mergeTags(template.body));
    }
  }

  function loadRecommendation(rec: Recommendation) {
    const template = templates.find((t) => t.id === rec.templateId);
    if (template) {
      setComposeTemplateId(template.id);
      setComposeSubject(mergeTags(template.subject));
      setComposeBody(mergeTags(template.body));
    } else {
      setComposeSubject(mergeTags(rec.templateSubject));
      setComposeBody("");
    }
    setComposeOpen(true);
  }

  function resetCompose() {
    setComposeOpen(false);
    setComposeSubject("");
    setComposeBody("");
    setComposeTemplateId("");
    setIncludeSignature(false);
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeAttachments([]);
    setReplyMode(false);
    setReplyToEmailId(null);
    setReplyToType(null);
  }

  function handleReply(item: { id: string; type: string; subject: string; date: string; fromName: string | null; fromEmail: string | null; body: string | null; bodyText: string | null }) {
    setReplyMode(true);
    setReplyToEmailId(item.id);
    setReplyToType(item.type);
    const subj = item.subject.startsWith("Re:") ? item.subject : `Re: ${item.subject}`;
    setComposeSubject(subj);
    const sender = item.type === "received" ? (item.fromName || item.fromEmail || "customer") : "you";
    const quotedContent = `<br/><br/><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:4px;color:#666"><p><strong>On ${new Date(item.date).toLocaleString()}, ${sender} wrote:</strong></p>${item.body || (item.bodyText ? `<p>${item.bodyText}</p>` : "")}</div>`;
    setComposeBody(quotedContent);
    setComposeTemplateId("");
    setComposeCc("");
    setComposeBcc("");
    setShowCcBcc(false);
    setComposeAttachments([]);
    setIncludeSignature(false);
    setComposeOpen(true);
  }

  function toggleEmailExpanded(emailKey: string) {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailKey)) next.delete(emailKey);
      else next.add(emailKey);
      return next;
    });
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSendEmail() {
    if (!lead || !composeSubject.trim() || !composeBody.trim()) return;
    setComposeSending(true);
    try {
      const formData = new FormData();
      formData.append("subject", composeSubject.trim());
      formData.append("body", composeBody.trim());
      if (composeTemplateId) formData.append("templateId", composeTemplateId);
      formData.append("includeSignature", String(includeSignature));
      if (composeCc.trim()) formData.append("cc", composeCc.trim());
      if (composeBcc.trim()) formData.append("bcc", composeBcc.trim());
      if (replyToEmailId && replyToType) {
        formData.append("replyToEmailId", replyToEmailId);
        formData.append("replyToType", replyToType);
      }
      composeAttachments.forEach((f) => formData.append("attachments", f));

      const res = await fetch(`/api/leads/${lead.id}/emails`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        resetCompose();
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lead) return;
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/leads/${lead.id}/files`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchLead();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload file");
      }
    } catch {
      alert("Failed to upload file");
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!lead || !confirm("Delete this file?")) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}/files/${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchLead();
      }
    } catch {
      alert("Failed to delete file");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center py-16">
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
    <div>
      {/* Top bar with lead info and actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 px-6 py-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
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
            {/* Assignment dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">Assigned:</span>
              <select
                value={lead.assignedTo?.id || ""}
                onChange={(e) => handleAssign(e.target.value)}
                disabled={assigning}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {adminUsers.filter((a) => a.active).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Watch button */}
            <button
              onClick={handleToggleWatch}
              disabled={watchToggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                isWatching
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                  : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={isWatching ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              {isWatching ? "Watching" : "Watch"}
              {watcherCount > 0 && (
                <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-[10px]">
                  {watcherCount}
                </span>
              )}
            </button>

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

      <div>
        <div className="grid grid-cols-1 xl:grid-cols-12 lg:grid-cols-2 gap-4">
          {/* Left Column — Lead Info + Emails */}
          <div className="xl:col-span-6 space-y-4">
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
                      className="px-3 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
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

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +1 (416) 555-0123"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                    />
                  </div>

                  {/* City, Zip, Date Created */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Toronto"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        value={editZip}
                        onChange={(e) => setEditZip(e.target.value)}
                        placeholder="e.g. M5V 2T6"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date Created
                      </label>
                      <input
                        type="date"
                        value={editDateCreated}
                        onChange={(e) => setEditDateCreated(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  {/* Job Title, Company Name, Location */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={editJobTitle}
                        onChange={(e) => setEditJobTitle(e.target.value)}
                        placeholder="e.g. CTO"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        placeholder="e.g. Acme Inc"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  {/* Industry, Company Size, Company Website */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Industry
                      </label>
                      <input
                        type="text"
                        value={editIndustry}
                        onChange={(e) => setEditIndustry(e.target.value)}
                        placeholder="e.g. Technology"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Company Size
                      </label>
                      <input
                        type="text"
                        value={editCompanySize}
                        onChange={(e) => setEditCompanySize(e.target.value)}
                        placeholder="e.g. 50-200"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Company Website
                      </label>
                      <input
                        type="url"
                        value={editCompanyWebsite}
                        onChange={(e) => setEditCompanyWebsite(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>

                  {/* Lead Source */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Lead Source
                      </label>
                      <select
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                      >
                        <option value="MANUAL">Manual</option>
                        <option value="AGENT">Agent</option>
                        <option value="BARK">Bark</option>
                        <option value="LINKEDIN_SALES_NAV">LinkedIn Sales Nav</option>
                        <option value="APOLLO">Apollo.io</option>
                        <option value="LINKEDIN_COMPANY_PAGE">LinkedIn Company Page</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="WEBSITE">Website</option>
                        <option value="COLD_OUTREACH">Cold Outreach</option>
                        <option value="EVENT">Event</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
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

                  {/* Zoho CRM in edit mode */}
                  {zohoEnabled && !zohoFound && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <span className="text-sm text-orange-700 dark:text-orange-300">Not in Zoho CRM</span>
                      <button
                        type="button"
                        onClick={handleCreateInZoho}
                        disabled={zohoCreating}
                        className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-md disabled:opacity-50 transition"
                      >
                        {zohoCreating ? "Creating..." : "Create in Zoho"}
                      </button>
                    </div>
                  )}
                  {zohoEnabled && zohoFound && zohoUrl && (
                    <div className="flex items-center gap-2 flex-wrap p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <span className="text-sm text-orange-700 dark:text-orange-300">Available in Zoho CRM</span>
                      <button
                        type="button"
                        onClick={handleSyncWithZoho}
                        disabled={zohoSyncing}
                        className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-md disabled:opacity-50 transition inline-flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={zohoSyncing ? "animate-spin" : ""}>
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                        </svg>
                        {zohoSyncing ? "Syncing..." : "Sync"}
                      </button>
                      <a
                        href={zohoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-800 px-2.5 py-1 rounded-md hover:bg-orange-200 dark:hover:bg-orange-700 transition"
                      >
                        View in Zoho &rarr;
                      </a>
                    </div>
                  )}
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.source === "AGENT" ? "bg-cyan-100 text-cyan-800" : lead.source === "BARK" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {lead.source === "AGENT" ? "Agent" : lead.source === "BARK" ? "Bark" : "Manual"}
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
                    {lead.phone && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Phone
                        </p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {lead.phone}
                        </p>
                      </div>
                    )}
                    {lead.city && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          City
                        </p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {lead.city}
                        </p>
                      </div>
                    )}
                    {lead.zip && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Zip Code
                        </p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {lead.zip}
                        </p>
                      </div>
                    )}
                    {lead.dateCreated && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Date Created
                        </p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {new Date(lead.dateCreated).toLocaleDateString()}
                        </p>
                      </div>
                    )}
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
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-white font-medium">
                          {lead.emailSent ? "Sent" : "Not sent"}
                        </p>
                        {!lead.doNotContact && (
                          <button
                            onClick={handleSendWelcomeEmail}
                            disabled={sendingWelcome}
                            className="text-xs font-medium text-[#01358d] dark:text-blue-400 hover:underline disabled:opacity-50"
                          >
                            {sendingWelcome ? "Sending..." : lead.emailSent ? "Resend" : "Send Now"}
                          </button>
                        )}
                      </div>
                    </div>
                    {lead.jobTitle && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.jobTitle}</p>
                      </div>
                    )}
                    {lead.companyName && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Company Name</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.companyName}</p>
                      </div>
                    )}
                    {lead.location && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.location}</p>
                      </div>
                    )}
                    {lead.industry && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Industry</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.industry}</p>
                      </div>
                    )}
                    {lead.companySize && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Company Size</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.companySize}</p>
                      </div>
                    )}
                    {lead.companyWebsite && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Company Website</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                            {lead.companyWebsite}
                          </a>
                        </p>
                      </div>
                    )}
                    {lead.leadScore != null && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Lead Score</p>
                        <p className="text-gray-900 dark:text-white font-medium">{lead.leadScore}</p>
                      </div>
                    )}
                    {lead.lastContactedDate && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Last Contacted</p>
                        <p className="text-gray-900 dark:text-white font-medium">{new Date(lead.lastContactedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {lead.extractedDate && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Extracted Date</p>
                        <p className="text-gray-900 dark:text-white font-medium">{new Date(lead.extractedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Outreach Tracking */}
                  {(lead.connectionRequestSent || lead.connectionAccepted || lead.initialMessageSent || lead.meetingBooked || lead.responseReceived) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lead.connectionRequestSent && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Connection Sent</span>}
                      {lead.connectionAccepted && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Connection Accepted</span>}
                      {lead.initialMessageSent && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Message Sent</span>}
                      {lead.meetingBooked && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Meeting Booked</span>}
                      {lead.responseReceived && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Response Received</span>}
                      {lead.meetingDate && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">Meeting: {new Date(lead.meetingDate).toLocaleDateString()}</span>}
                    </div>
                  )}

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

                  {/* Zoho CRM Status */}
                  {zohoEnabled && (
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400 flex-shrink-0">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        {zohoLoading ? (
                          <span className="text-sm text-orange-700 dark:text-orange-300">Checking Zoho CRM...</span>
                        ) : zohoFound && zohoUrl ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-orange-700 dark:text-orange-300">Available in Zoho CRM</span>
                            <button
                              onClick={handleSyncWithZoho}
                              disabled={zohoSyncing}
                              className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-md disabled:opacity-50 transition inline-flex items-center gap-1.5"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={zohoSyncing ? "animate-spin" : ""}>
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                              </svg>
                              {zohoSyncing ? "Syncing..." : "Sync with Zoho"}
                            </button>
                            <a
                              href={zohoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-orange-800 dark:text-orange-200 bg-orange-100 dark:bg-orange-800 px-2.5 py-1 rounded-md hover:bg-orange-200 dark:hover:bg-orange-700 transition"
                            >
                              View in Zoho &rarr;
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-700 dark:text-orange-300">Not in Zoho CRM</span>
                            <button
                              onClick={handleCreateInZoho}
                              disabled={zohoCreating}
                              className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-md disabled:opacity-50 transition"
                            >
                              {zohoCreating ? "Creating..." : "Create in Zoho"}
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Sync result */}
                      {zohoSyncResult && (
                        <div className={`text-sm rounded-md px-3 py-2 ${
                          zohoSyncResult.direction === "none"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}>
                          <p className="font-medium">{zohoSyncResult.message}</p>
                          {zohoSyncResult.changes && zohoSyncResult.changes.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-xs">
                              {zohoSyncResult.changes.map((c, i) => (
                                <li key={i}>{c.field}: <span className="line-through opacity-60">{c.from || "(empty)"}</span> &rarr; {c.to || "(empty)"}</li>
                              ))}
                            </ul>
                          )}
                          {zohoSyncResult.changes && zohoSyncResult.changes.length === 0 && zohoSyncResult.direction !== "none" && (
                            <p className="text-xs mt-1 opacity-75">No field differences detected.</p>
                          )}
                        </div>
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

                  {/* Customer Portal Link */}
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Customer Portal URL</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`${process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${lead.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-700 dark:text-indigo-300 hover:underline break-all"
                      >
                        {`${process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${lead.id}`}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "https://leadsportal.kitlabs.us"}/project?id=${lead.id}`);
                        }}
                        className="text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 flex-shrink-0"
                        title="Copy URL"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </div>
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
                  {replyMode ? "Reply to Email" : "Send Email"}
                </h2>
                {!composeOpen && (
                  <button
                    onClick={() => {
                      if (lead.doNotContact) { alert("Cannot send email — Do Not Contact is enabled. Disable it first."); return; }
                      resetCompose(); setComposeOpen(true);
                    }}
                    disabled={lead.doNotContact}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${lead.doNotContact ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-700"}`}
                  >
                    Compose Email
                  </button>
                )}
              </div>

              {composeOpen && (
                <div className="space-y-4">
                  {/* Reply mode banner */}
                  {replyMode && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Replying to: <strong>{composeSubject.replace(/^Re:\s*/, "")}</strong>
                      </span>
                      <button
                        onClick={() => { resetCompose(); setComposeOpen(true); }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Switch to new email
                      </button>
                    </div>
                  )}

                  {!replyMode && (
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
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Tags auto-merge on send: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{customerName}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{projectName}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{customerEmail}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{customerPhone}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{customerCity}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{status}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{stage}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{source}}"}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{"{{dateCreated}}"}</code>
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        To
                      </label>
                      {!showCcBcc && (
                        <button
                          type="button"
                          onClick={() => setShowCcBcc(true)}
                          className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          CC/BCC
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={lead.customerEmail}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    />
                  </div>

                  {/* CC / BCC */}
                  {showCcBcc && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          CC
                        </label>
                        <input
                          type="text"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          placeholder="email1@example.com, email2@example.com"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          BCC
                        </label>
                        <input
                          type="text"
                          value={composeBcc}
                          onChange={(e) => setComposeBcc(e.target.value)}
                          placeholder="email@example.com"
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                        />
                      </div>
                    </div>
                  )}

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

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Attachments
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                      Add files
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setComposeAttachments((prev) => [...prev, ...files]);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-400 ml-2">Max 10MB per file, 25MB total</span>
                    {composeAttachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {composeAttachments.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                              {file.name} <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                            </span>
                            <button
                              onClick={() => setComposeAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      {composeSending ? "Sending..." : replyMode ? "Send Reply" : "Send Email"}
                    </button>
                    <button
                      onClick={() => setPreviewOpen(true)}
                      disabled={!composeBody.trim()}
                      className="px-4 py-2.5 border border-blue-300 dark:border-blue-600 rounded-lg text-sm text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Preview
                    </button>
                    <button
                      onClick={resetCompose}
                      className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Email Preview Modal */}
            {previewOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Preview</h3>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">To:</span> {lead?.customerEmail}
                    </p>
                    {composeCc.trim() && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">CC:</span> {composeCc}
                      </p>
                    )}
                    {composeBcc.trim() && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">BCC:</span> {composeBcc}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Subject:</span> {composeSubject || "(no subject)"}
                    </p>
                    {composeAttachments.length > 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Attachments:</span> {composeAttachments.map((f) => f.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-white">
                    <div className="mx-auto" style={{ maxWidth: 600 }}>
                      <iframe
                        title="Email Preview"
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#333;background:#fff}img{max-width:100%}a{color:#2563eb}</style></head><body>${composeBody}${includeSignature && adminSignature ? '<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />' + adminSignature : ""}</body></html>`}
                        className="w-full border border-gray-200 rounded-lg"
                        style={{ minHeight: 400, background: "#fff" }}
                      />
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-3">
                    <button
                      onClick={() => setPreviewOpen(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Back to Editor
                    </button>
                    <button
                      onClick={() => { setPreviewOpen(false); handleSendEmail(); }}
                      disabled={!composeSubject.trim() || !composeBody.trim() || composeSending}
                      className="bg-teal-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* Email Conversation Thread */}
            {(() => {
              const allEmails = [
                ...lead.sentEmails.map((e) => ({
                  type: "sent" as const,
                  id: e.id,
                  subject: e.subject,
                  date: e.createdAt,
                  status: e.status,
                  openedAt: e.openedAt,
                  sentBy: e.sentBy,
                  template: e.template,
                  body: e.body,
                  cc: e.cc,
                  bcc: e.bcc,
                  attachments: e.attachments,
                  fromName: null as string | null,
                  fromEmail: null as string | null,
                  bodyText: null as string | null,
                  bodyHtml: null as string | null,
                })),
                ...lead.receivedEmails.map((e) => ({
                  type: "received" as const,
                  id: e.id,
                  subject: e.subject,
                  date: e.receivedAt,
                  status: null as string | null,
                  openedAt: null as string | null,
                  sentBy: null as string | null,
                  template: null as { title: string; purpose: string } | null,
                  body: null as string | null,
                  cc: null as string | null,
                  bcc: null as string | null,
                  attachments: [] as EmailAttachmentItem[],
                  fromName: e.fromName,
                  fromEmail: e.fromEmail,
                  bodyText: e.bodyText,
                  bodyHtml: e.bodyHtml,
                })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              const totalCount = allEmails.length;
              const visibleEmails = threadCollapsed ? allEmails.slice(0, 3) : allEmails;

              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
                  <button
                    onClick={() => setThreadCollapsed(!threadCollapsed)}
                    className="flex items-center justify-between w-full mb-4"
                  >
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Email Conversation ({totalCount})
                    </h2>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> Sent
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Received
                        </span>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className={`w-4 h-4 text-gray-400 transition-transform ${threadCollapsed ? "" : "rotate-180"}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>

                  {totalCount === 0 ? (
                    <p className="text-gray-400 text-sm">No email activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {visibleEmails.map((item) => {
                        const emailKey = `${item.type}-${item.id}`;
                        const isExpanded = expandedEmails.has(emailKey);

                        return (
                          <div
                            key={emailKey}
                            className={`rounded-lg border p-4 ${
                              item.type === "sent"
                                ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 ml-8"
                                : "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 mr-8"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.type === "sent" ? (
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-teal-700 dark:text-teal-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                    Sent {item.sentBy ? `by ${item.sentBy}` : ""}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
                                    </svg>
                                    From {item.fromName || item.fromEmail}
                                  </span>
                                )}
                                {item.status && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EMAIL_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"}`}>
                                    {item.status}
                                  </span>
                                )}
                                {item.openedAt && (
                                  <span className="text-xs text-gray-400">
                                    Opened {new Date(item.openedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {new Date(item.date).toLocaleString()}
                              </span>
                            </div>

                            {/* Subject */}
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.subject}
                            </p>

                            {/* CC/BCC info */}
                            {item.cc && (
                              <p className="text-xs text-gray-400 mt-0.5">CC: {item.cc}</p>
                            )}
                            {item.bcc && (
                              <p className="text-xs text-gray-400">BCC: {item.bcc}</p>
                            )}

                            {item.template && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Template: {item.template.title}
                              </p>
                            )}

                            {/* Attachments */}
                            {item.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.attachments.map((att) => (
                                  <a
                                    key={att.id}
                                    href={att.filePath}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                    </svg>
                                    {att.fileName}
                                    <span className="text-gray-400">({formatFileSize(att.fileSize)})</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Action buttons row */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => toggleEmailExpanded(emailKey)}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                              >
                                {isExpanded ? "Hide body" : "Show body"}
                              </button>
                              <button
                                onClick={() => handleReply(item)}
                                className={`text-xs font-medium transition ${
                                  item.type === "received"
                                    ? "text-blue-600 dark:text-blue-400 hover:text-blue-800"
                                    : "text-teal-600 dark:text-teal-400 hover:text-teal-800"
                                }`}
                              >
                                Reply
                              </button>
                            </div>

                            {/* Expanded body */}
                            {isExpanded && (
                              <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-auto max-h-96">
                                {item.type === "sent" && item.body ? (
                                  <div
                                    className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: item.body }}
                                  />
                                ) : item.type === "received" && (item.bodyHtml || item.bodyText) ? (
                                  item.bodyHtml ? (
                                    <div
                                      className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none"
                                      dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
                                    />
                                  ) : (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                      {item.bodyText}
                                    </p>
                                  )
                                ) : (
                                  <p className="text-sm text-gray-400 italic">No body content available</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Show more / less toggle */}
                      {totalCount > 3 && (
                        <button
                          onClick={() => setThreadCollapsed(!threadCollapsed)}
                          className="w-full text-center py-2 text-sm text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {threadCollapsed
                            ? `Show all ${totalCount} emails`
                            : "Collapse thread"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Files Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Attached Files
                </h2>
                <label className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition cursor-pointer">
                  {fileUploading ? "Uploading..." : "Upload File"}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={fileUploading}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Any file type, max 25MB per file.
              </p>

              {lead.files.length === 0 ? (
                <p className="text-gray-400 text-sm">No files attached yet</p>
              ) : (
                <div className="space-y-2">
                  {lead.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600"
                    >
                      <div className="flex-1 min-w-0">
                        <a
                          href={file.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                        >
                          {file.fileName}
                        </a>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatFileSize(file.fileSize)}
                          {file.uploadedBy && ` · ${file.uploadedBy}`}
                          {" · "}
                          {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="ml-3 text-red-500 hover:text-red-700 text-xs font-medium transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scope of Work Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scope of Work
                </h2>
                <button
                  onClick={() => router.push(`/leads/${lead.id}/sow-builder`)}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Build with AI
                </button>
              </div>

              {/* Upload new SOW */}
              <div className="mb-4">
                <textarea
                  value={sowComments}
                  onChange={(e) => setSowComments(e.target.value)}
                  placeholder="What changed in this version? (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none mb-2"
                />
                <label className="inline-flex items-center px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition cursor-pointer">
                  {sowUploading ? "Uploading..." : sows.length === 0 ? "Upload SOW" : "Upload New Version"}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleSowUpload}
                    disabled={sowUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1">PDF or Word document, max 25MB</p>
              </div>

              {/* SOW version history */}
              {sows.length === 0 ? (
                <p className="text-gray-400 text-sm">No scope of work uploaded yet</p>
              ) : (
                <div className="space-y-3">
                  {sows.map((sow) => (
                    <div
                      key={sow.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              Version {sow.version}
                            </span>
                            {sow.content && !sow.filePath && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                AI Generated
                              </span>
                            )}
                            {sow.isDraft && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Draft
                              </span>
                            )}
                            {sow.sharedAt && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Shared
                              </span>
                            )}
                          </div>
                          {sow.filePath ? (
                            <a
                              href={sow.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block mt-0.5"
                            >
                              {sow.fileName}
                            </a>
                          ) : sow.content ? (
                            <button
                              onClick={() => router.push(`/leads/${lead.id}/sow-builder`)}
                              className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-0.5"
                            >
                              Open in SOW Builder
                            </button>
                          ) : null}
                          <p className="text-xs text-gray-400 mt-1">
                            {sow.fileSize ? formatFileSize(sow.fileSize) : ""}
                            {sow.uploadedBy && `${sow.fileSize ? " · " : ""}${sow.uploadedBy}`}
                            {" · "}
                            {new Date(sow.createdAt).toLocaleString()}
                          </p>
                          {sow.comments && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                              {sow.comments}
                            </p>
                          )}
                          {sow.sharedAt && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Shared by {sow.sharedBy} on {new Date(sow.sharedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {sow.fileType === "application/pdf" && sow.filePath && (
                            <a
                              href={sow.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                            >
                              Preview
                            </a>
                          )}
                          <button
                            onClick={() => handleShareSow(sow.id)}
                            disabled={sowSharing === sow.id || sow.isDraft}
                            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                          >
                            {sowSharing === sow.id ? "Sharing..." : sow.sharedAt ? "Re-share" : "Share with Customer"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* App Flows Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  App Flows
                </h2>
                <button
                  onClick={() => router.push(`/leads/${lead.id}/app-flow-builder`)}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                  Create App Flow
                </button>
              </div>

              {appFlows.length === 0 ? (
                <p className="text-gray-400 text-sm">No app flows created yet</p>
              ) : (
                <div className="space-y-3">
                  {appFlows.map((flow) => (
                    <div
                      key={flow.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {flow.name}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              flow.flowType === "WIREFRAME"
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}>
                              {flow.flowType === "WIREFRAME" ? "Wireframe" : "Basic"}
                            </span>
                            {flow.sharedAt && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Shared
                              </span>
                            )}
                            {flow._count && flow._count.comments > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                                {flow._count.comments} comment{flow._count.comments !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Created {new Date(flow.createdAt).toLocaleString()}
                          </p>
                          {flow.sharedAt && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Shared by {flow.sharedBy} on {new Date(flow.sharedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => router.push(`/leads/${lead.id}/app-flow-builder?flowId=${flow.id}`)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleShareAppFlow(flow.id)}
                            disabled={appFlowSharing === flow.id}
                            className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                          >
                            {appFlowSharing === flow.id ? "Sharing..." : flow.sharedAt ? "Re-share" : "Share"}
                          </button>
                          <button
                            onClick={() => handleDeleteAppFlow(flow.id)}
                            className="px-3 py-1.5 text-xs font-medium border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Status, Notes, Next Steps, Audit */}
          <div className="xl:col-span-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Do Not Contact Banner */}
            {lead.doNotContact && (
              <div className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Do Not Contact</p>
                    <p className="text-xs text-red-600 dark:text-red-400">All outbound emails and sharing are blocked for this lead.</p>
                  </div>
                </div>
                <button
                  onClick={handleToggleDoNotContact}
                  className="text-xs font-medium text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                >
                  Disable
                </button>
              </div>
            )}

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

              <label className={`flex items-center gap-2 mb-4 ${lead.doNotContact ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={lead.doNotContact ? false : notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  disabled={lead.doNotContact}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Notify Customer {lead.doNotContact && <span className="text-red-500 text-xs">(blocked)</span>}
                </span>
              </label>

              <button
                onClick={handleStatusUpdate}
                disabled={newStatus === lead.status || statusUpdating}
                className="w-full bg-[#01358d] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
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
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
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

            {/* Notes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Admin Notes
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 mb-3">Internal only — not visible to customers</p>

              {/* Notes History */}
              {lead.notes.length > 0 && (
                <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                  {lead.notes.map((note) => {
                    const isOwner = note.createdBy === currentAdminName;
                    const isEditing = editingNoteId === note.id;

                    return (
                      <div
                        key={note.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-100 dark:border-gray-600"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 outline-none resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditNote(note.id, editingNoteContent)}
                                disabled={!editingNoteContent.trim()}
                                className="text-xs font-medium text-white bg-[#01358d] hover:bg-[#012a70] px-3 py-1 rounded disabled:opacity-50 transition"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}
                                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                              {note.content}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-400">
                                {note.createdBy && (
                                  <span className="font-medium text-gray-500 dark:text-gray-300">{note.createdBy}</span>
                                )}
                                {note.createdBy && " — "}
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                              {isOwner && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}
                                    className="text-xs text-gray-400 hover:text-[#01358d] dark:hover:text-blue-400 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Note Input */}
              <div className="flex gap-3">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  rows={2}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || noteAdding}
                  className="self-end bg-[#01358d] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {noteAdding ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>

            {/* Next Steps Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Next Steps
              </h2>

              {/* Existing Steps */}
              {nextSteps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {nextSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                        step.completed
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : step.dueDate && new Date(step.dueDate) < new Date() ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600"
                      }`}
                    >
                      <button
                        onClick={() => handleToggleNextStep(step.id, !step.completed)}
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          step.completed
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 dark:border-gray-500 hover:border-[#01358d]"
                        }`}
                      >
                        {step.completed && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${step.completed ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                          {step.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {step.dueDate && (
                            <span className={`text-xs ${
                              step.completed ? "text-gray-400" : new Date(step.dueDate) < new Date() ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"
                            }`}>
                              Due: {new Date(step.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {step.createdBy && `${step.createdBy} — `}{new Date(step.createdAt).toLocaleDateString()}
                          </span>
                          {step.completed && step.completedAt && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Completed {new Date(step.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNextStep(step.id)}
                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition flex-shrink-0"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Next Step */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={nextStepContent}
                    onChange={(e) => setNextStepContent(e.target.value)}
                    placeholder="Add a next step..."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter" && nextStepContent.trim()) handleAddNextStep(); }}
                  />
                </div>
                <input
                  type="date"
                  value={nextStepDueDate}
                  onChange={(e) => setNextStepDueDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm w-40"
                  title="Due date (optional)"
                />
                <button
                  onClick={handleAddNextStep}
                  disabled={!nextStepContent.trim() || nextStepAdding}
                  className="bg-[#01358d] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                >
                  {nextStepAdding ? "Adding..." : "Add Step"}
                </button>
              </div>
            </div>

            {/* Audit Log */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Audit Log
              </h2>
              {auditLogs.length === 0 ? (
                <p className="text-gray-400 text-xs">No activity recorded yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-2 text-xs">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-gray-700 dark:text-gray-300 font-medium">{log.action}</p>
                        {log.detail && <p className="text-gray-500 dark:text-gray-400 truncate">{log.detail}</p>}
                        <p className="text-gray-400">
                          {log.actor && `${log.actor} — `}{new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
