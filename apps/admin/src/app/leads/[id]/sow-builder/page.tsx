"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("../../../../components/RichTextEditor"),
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

interface LeadData {
  id: string;
  projectName: string;
  customerName: string;
  projectDescription: string;
  city: string | null;
}

interface SowVersion {
  id: string;
  version: number;
  content: string | null;
  isDraft: boolean;
  comments: string | null;
  uploadedBy: string | null;
  sharedAt: string | null;
  sharedBy: string | null;
  createdAt: string;
  fileName: string | null;
  filePath: string | null;
}

export default function SowBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;

  // Lead data
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form inputs
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [techStack, setTechStack] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Editor content
  const [content, setContent] = useState("");
  const contentRef = useRef("");

  // AI generation state
  const [generating, setGenerating] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Save/export state
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [currentSowId, setCurrentSowId] = useState<string | null>(null);

  // Version management
  const [versions, setVersions] = useState<SowVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Fetch lead data
  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (res.ok) {
          const data = await res.json();
          setLead({
            id: data.id,
            projectName: data.projectName,
            customerName: data.customerName,
            projectDescription: data.projectDescription,
            city: data.city,
          });
          setProjectDescription(data.projectDescription || "");
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [leadId]);

  // Fetch existing SOW versions (including drafts)
  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch(`/api/leads/${leadId}/sow?includeDrafts=true`);
        if (res.ok) {
          const data: SowVersion[] = await res.json();
          setVersions(data);
          // Auto-load latest AI-generated version if any
          const aiVersions = data.filter((v) => v.content);
          if (aiVersions.length > 0) {
            const latest = aiVersions[0]; // already sorted desc
            setContent(latest.content || "");
            contentRef.current = latest.content || "";
            setCurrentSowId(latest.id);
            setSelectedVersionId(latest.id);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchVersions();
  }, [leadId]);

  // Handle version selection
  const handleVersionSelect = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (version?.content) {
        setContent(version.content);
        contentRef.current = version.content;
        setCurrentSowId(version.id);
        setSelectedVersionId(versionId);
      }
    },
    [versions]
  );

  // AI Generation with streaming
  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    setStreamText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/leads/${leadId}/sow/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectDescription,
          projectType,
          timeline,
          budgetRange,
          techStack,
          deliverables,
          additionalNotes,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate SOW");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const text = JSON.parse(payload);
            if (typeof text === "string" && text !== "[ERROR]") {
              accumulated += text;
              setStreamText(accumulated);
            } else if (text === "[ERROR]") {
              alert("An error occurred during generation");
            }
          } catch {
            // skip malformed
          }
        }
      }

      // Set final content into editor
      if (accumulated) {
        setContent(accumulated);
        contentRef.current = accumulated;
        setCurrentSowId(null); // new unsaved content
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        alert("Failed to generate SOW");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  // Update content from streaming into editor
  useEffect(() => {
    if (generating && streamText) {
      setContent(streamText);
      contentRef.current = streamText;
    }
  }, [streamText, generating]);

  function handleStopGeneration() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  // Save draft or final
  async function handleSave(isDraft: boolean) {
    const trimmed = contentRef.current.trim();
    if (!trimmed || trimmed === "<p></p>") {
      alert("No content to save");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/sow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          isDraft,
          sowId: currentSowId || undefined,
          comments: isDraft ? "AI-generated draft" : "AI-generated SOW",
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setCurrentSowId(saved.id);
        // Refresh versions
        const verRes = await fetch(`/api/leads/${leadId}/sow?includeDrafts=true`);
        if (verRes.ok) {
          const data = await verRes.json();
          setVersions(data);
          setSelectedVersionId(saved.id);
        }
        alert(isDraft ? "Draft saved!" : "SOW saved & finalized!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Download DOCX
  async function handleDownloadDocx() {
    const trimmed = contentRef.current.trim();
    if (!trimmed || trimmed === "<p></p>") return;

    try {
      const res = await fetch(`/api/leads/${leadId}/sow/export-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          projectName: lead?.projectName,
        }),
      });

      if (!res.ok) {
        alert("Failed to generate document");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "Scope-of-Work.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download document");
    }
  }

  // Download PDF (client-side)
  async function handleDownloadPdf() {
    const trimmed = contentRef.current.trim();
    if (!trimmed || trimmed === "<p></p>") return;

    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.innerHTML = trimmed;
    container.style.padding = "40px";
    container.style.fontFamily = "Arial, sans-serif";
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.6";
    container.style.color = "#1a1a1a";
    document.body.appendChild(container);

    const fileName = lead?.projectName
      ? `SOW - ${lead.projectName}.pdf`
      : "Scope-of-Work.pdf";

    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: fileName,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(container)
      .save();

    document.body.removeChild(container);
  }

  // Share with customer
  async function handleShare() {
    // Save first if not saved
    let sowId = currentSowId;
    if (!sowId) {
      const trimmed = contentRef.current.trim();
      if (!trimmed || trimmed === "<p></p>") {
        alert("No content to share");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/leads/${leadId}/sow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed, isDraft: false, comments: "AI-generated SOW" }),
        });
        if (!res.ok) {
          alert("Failed to save before sharing");
          setSaving(false);
          return;
        }
        const saved = await res.json();
        sowId = saved.id;
        setCurrentSowId(saved.id);
      } catch {
        alert("Failed to save before sharing");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setSharing(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/sow/${sowId}/share`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.warning) {
          alert(data.warning);
        } else {
          alert("SOW shared with customer! Email sent and status updated.");
        }
        // Refresh versions
        const verRes = await fetch(`/api/leads/${leadId}/sow?includeDrafts=true`);
        if (verRes.ok) setVersions(await verRes.json());
      } else {
        const err = await res.json();
        alert(err.error || "Failed to share");
      }
    } catch {
      alert("Failed to share SOW");
    } finally {
      setSharing(false);
    }
  }

  // Track editor changes
  const handleEditorChange = useCallback((html: string) => {
    contentRef.current = html;
    setContent(html);
  }, []);

  const hasContent = content.trim() && content !== "<p></p>";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">Lead not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/leads/${leadId}`)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back to Lead
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SOW Builder
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lead.projectName} &middot; {lead.customerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Version selector */}
            {versions.filter((v) => v.content).length > 0 && (
              <select
                value={selectedVersionId || ""}
                onChange={(e) => handleVersionSelect(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">New Version</option>
                {versions
                  .filter((v) => v.content)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}
                      {v.isDraft ? " (Draft)" : ""}
                      {v.sharedAt ? " - Shared" : ""}
                    </option>
                  ))}
              </select>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Project Details
              </h2>

              {/* Read-only lead fields */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Project Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {lead.projectName}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Client Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {lead.customerName}
                  {lead.city && (
                    <span className="text-gray-400 font-normal">
                      {" "}
                      &middot; {lead.city}
                    </span>
                  )}
                </p>
              </div>

              {/* Editable fields */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Project Description *
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                  placeholder="Describe the project..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select type...</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Timeline
                  </label>
                  <input
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g. 8 weeks"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Budget Range
                  </label>
                  <input
                    type="text"
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    placeholder="e.g. $10k - $15k"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tech Stack
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. Next.js, React, PostgreSQL"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Key Deliverables
                </label>
                <textarea
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  rows={3}
                  placeholder="List the main deliverables..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  placeholder="Any extra details for the AI..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-y"
                />
              </div>

              {/* Generate button */}
              {generating ? (
                <button
                  onClick={handleStopGeneration}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Generation
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={!projectDescription.trim()}
                  className="w-full py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                  Generate with AI
                </button>
              )}

              {generating && (
                <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                  Generating SOW...
                </div>
              )}
            </div>
          </div>

          {/* Right Column — Editor + Actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Editor */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scope of Work
                </h2>
                {currentSowId && (
                  <span className="text-xs text-gray-400">
                    Saved &middot;{" "}
                    {versions.find((v) => v.id === currentSowId)?.isDraft
                      ? "Draft"
                      : "Final"}
                  </span>
                )}
              </div>
              <RichTextEditor
                content={content}
                onChange={handleEditorChange}
                placeholder="Generate a SOW using the form on the left, or start writing manually..."
              />
            </div>

            {/* Action Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Save actions */}
                <button
                  onClick={() => handleSave(true)}
                  disabled={!hasContent || saving}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={!hasContent || saving}
                  className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? "Saving..." : "Save & Finalize"}
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Download actions */}
                <button
                  onClick={handleDownloadDocx}
                  disabled={!hasContent}
                  className="px-4 py-2 text-sm font-medium border border-blue-300 dark:border-blue-700 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  DOCX
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={!hasContent}
                  className="px-4 py-2 text-sm font-medium border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  PDF
                </button>

                <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                {/* Share */}
                <button
                  onClick={handleShare}
                  disabled={!hasContent || sharing || saving}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                  {sharing
                    ? "Sharing..."
                    : "Share with Customer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
