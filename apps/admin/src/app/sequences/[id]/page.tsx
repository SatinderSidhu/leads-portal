"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const GOAL_LABELS: Record<string, string> = { BOOK_MEETING: "Book a Meeting", GET_REPLY: "Get a Reply", DRIVE_PURCHASE: "Drive a Purchase", NURTURE_ONLY: "Nurture Only" };
const TRIGGER_LABELS: Record<string, string> = { MANUAL: "Manual", STAGE_CHANGE: "Stage Changes", LEAD_CREATED: "New Lead Created", ADDED_TO_LIST: "Added to List" };
const SOURCE_LABELS: Record<string, string> = { APP_FACTORY: "App Factory", MANUAL: "Manual", APOLLO: "Apollo", LINKEDIN_SALES_NAV: "LinkedIn Sales Nav", WEBSITE: "Website", REFERRAL: "Referral", COLD_OUTREACH: "Cold Outreach", AGENT: "Agent", BARK: "Bark", EVENT: "Event", SMB_APP_CONTEST_2026: "SMB App Contest 2026", SMB_NY_2026: "SMB NY 2026", OTHER: "Other" };
const EXIT_LABELS: Record<string, string> = { REPLIED: "Contact replied", MEETING_BOOKED: "Meeting booked", UNSUBSCRIBED: "Unsubscribed / DNC" };
const STATUS_COLORS: Record<string, string> = { DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", PAUSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" };
const CONDITION_LABELS: Record<string, string> = { ALWAYS: "Always proceed", OPENED: "If opened", NOT_OPENED: "If not opened", CLICKED: "If clicked a link", NOT_CLICKED: "If no link clicked", REPLIED: "If replied", NOT_REPLIED: "If no reply" };
const CONDITION_OPTIONS = ["ALWAYS", "OPENED", "NOT_OPENED", "CLICKED", "NOT_CLICKED", "REPLIED", "NOT_REPLIED"];
const WAIT_UNIT_OPTIONS = [{ value: "HOURS", label: "Hours" }, { value: "DAYS", label: "Days" }, { value: "WEEKS", label: "Weeks" }];
const ENROLLMENT_COLORS: Record<string, string> = { ACTIVE: "bg-green-100 text-green-800", PAUSED: "bg-yellow-100 text-yellow-800", COMPLETED: "bg-blue-100 text-blue-800", EXITED: "bg-purple-100 text-purple-800", REMOVED: "bg-red-100 text-red-800" };
const ACTION_LABELS: Record<string, string> = { NONE: "No action", OPENED: "Opened", CLICKED: "Clicked", REPLIED: "Replied" };

interface Template { id: string; title: string; subject: string; body: string; purpose: string; sendAfterDays: number | null }

// Sample values for the in-page preview modal so admins can see how merge
// tags render before sending. Mirrors SAMPLE_DATA on the /email-templates
// page — keep them in sync when new tags are added to the renderer.
const PREVIEW_SAMPLE: Record<string, string> = {
  customerName: "Sarah Johnson",
  first_name: "Sarah",
  firstName: "Sarah",
  projectName: "Acme Mobile App",
  companyName: "Acme Corp",
  company_name: "Acme Corp",
  customerEmail: "sarah@acme.com",
  customerPhone: "+1 (555) 123-4567",
  customerCity: "New York",
  jobTitle: "Director of Product",
  status: "Design Ready",
  stage: "Warm",
  source: "Cold Outreach",
  dateCreated: new Date().toLocaleDateString(),
  customerPortalUrl: "https://leadsportal.kitlabs.us?id=sample",
  bookMeetingUrl: "https://leadsportal.kitlabs.us/book?leadId=sample",
};

function mergeSample(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [key, value] of Object.entries(PREVIEW_SAMPLE)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
interface Step { id?: string; templateId: string; template?: Template; waitValue: number; waitUnit: string; condition: string; goToStepOrder: number | null; exitOnCondition: string | null }
interface Enrollment { id: string; currentStepOrder: number; status: string; enrolledAt: string; lastEmailSentAt: string | null; lastAction: string; nextSendAt: string | null; exitReason: string | null; lead: { id: string; customerName: string; customerEmail: string; projectName: string; companyName: string | null } }
interface PreviewData { name: string; goal: string; stepCount: number; preview: string[] }
interface PerfData { summary: { totalEnrolled: number; active: number; completed: number; exited: number; removed: number; paused: number; conversionRate: number }; stepStats: { stepOrder: number; templateTitle: string; reached: number; currentlyAt: number }[] }

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tab, setTab] = useState<"steps" | "contacts" | "preview" | "performance">("steps");
  const [sequence, setSequence] = useState<{
    id: string; name: string; goal: string; status: string;
    enrollmentTrigger: string; triggerConfig: { source?: string; fromStage?: string; toStage?: string; listId?: string };
    audienceTags: string[]; exitConditions: string[]; reEnrollAfterDays: number | null;
    triggerList?: { name: string } | null;
    _count: { enrollments: number };
  } | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollTotal, setEnrollTotal] = useState(0);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [perf, setPerf] = useState<PerfData | null>(null);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; customerName: string; customerEmail: string; projectName: string }[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const fetchSequence = useCallback(() => {
    Promise.all([
      fetch(`/api/sequences/${id}`).then((r) => r.json()),
      fetch("/api/email-templates?type=compose").then((r) => r.json()),
    ]).then(([seq, tpls]) => {
      setSequence(seq);
      if (seq.steps) setSteps(seq.steps.map((s: Step & { stepOrder: number }) => ({ templateId: s.templateId, template: s.template, waitValue: s.waitValue, waitUnit: s.waitUnit, condition: s.condition, goToStepOrder: s.goToStepOrder, exitOnCondition: s.exitOnCondition })));
      if (Array.isArray(tpls)) setTemplates(tpls);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchSequence(); }, [fetchSequence]);

  // Tab data loaders
  useEffect(() => {
    if (tab === "contacts") {
      fetch(`/api/sequences/${id}/enrollments`).then((r) => r.json()).then((d) => { setEnrollments(d.enrollments || []); setEnrollTotal(d.pagination?.total || 0); });
    } else if (tab === "preview") {
      fetch(`/api/sequences/${id}/preview`).then((r) => r.json()).then(setPreview);
    } else if (tab === "performance") {
      fetch(`/api/sequences/${id}/performance`).then((r) => r.json()).then(setPerf);
    }
  }, [tab, id]);

  async function handleSaveSteps() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sequences/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: steps.map((s) => ({ templateId: s.templateId, waitValue: s.waitValue, waitUnit: s.waitUnit, condition: s.condition, goToStepOrder: s.goToStepOrder, exitOnCondition: s.exitOnCondition })) }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSteps(saved.map((s: Step & { stepOrder: number }) => ({ templateId: s.templateId, template: s.template, waitValue: s.waitValue, waitUnit: s.waitUnit, condition: s.condition, goToStepOrder: s.goToStepOrder, exitOnCondition: s.exitOnCondition })));
      } else { alert("Failed to save steps"); }
    } catch { alert("Failed to save steps"); }
    finally { setSaving(false); }
  }

  async function handleStatusToggle() {
    if (!sequence) return;
    const newStatus = sequence.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    if (newStatus === "ACTIVE" && steps.length === 0) { alert("Add at least one step before activating."); return; }
    const res = await fetch(`/api/sequences/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) { const updated = await res.json(); setSequence((prev) => prev ? { ...prev, status: updated.status } : prev); }
  }

  async function handleDelete() {
    if (!confirm("Delete this sequence? This cannot be undone.")) return;
    const res = await fetch(`/api/sequences/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/sequences");
    else { const d = await res.json(); alert(d.error || "Failed to delete"); }
  }

  async function handleEnrollmentAction(enrollmentId: string, action: string) {
    await fetch(`/api/sequences/${id}/enrollments/${enrollmentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const r = await fetch(`/api/sequences/${id}/enrollments`);
    const d = await r.json();
    setEnrollments(d.enrollments || []);
    setEnrollTotal(d.pagination?.total || 0);
  }

  async function handleSearchLeads() {
    if (!enrollSearch.trim()) return;
    const r = await fetch(`/api/leads?search=${encodeURIComponent(enrollSearch)}&limit=20`);
    const d = await r.json();
    setSearchResults(d.leads || []);
  }

  async function handleEnrollSelected() {
    if (selectedLeads.size === 0) return;
    setEnrolling(true);
    try {
      await fetch(`/api/sequences/${id}/enrollments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadIds: Array.from(selectedLeads) }) });
      setShowEnrollModal(false);
      setSelectedLeads(new Set());
      setSearchResults([]);
      setEnrollSearch("");
      // Refresh enrollments
      const r = await fetch(`/api/sequences/${id}/enrollments`);
      const d = await r.json();
      setEnrollments(d.enrollments || []);
      setEnrollTotal(d.pagination?.total || 0);
    } catch { alert("Failed to enroll"); }
    finally { setEnrolling(false); }
  }

  function addStep() {
    if (templates.length === 0) { alert("Create email templates first."); return; }
    setSteps((prev) => [...prev, { templateId: templates[0].id, template: templates[0], waitValue: prev.length === 0 ? 0 : 3, waitUnit: "DAYS", condition: "ALWAYS", goToStepOrder: null, exitOnCondition: null }]);
  }

  function updateStep(index: number, field: string, value: unknown) {
    setSteps((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, [field]: value };
      if (field === "templateId") { updated.template = templates.find((t) => t.id === value) || s.template; }
      return updated;
    }));
  }

  function removeStep(index: number) { setSteps((prev) => prev.filter((_, i) => i !== index)); }

  // Drag reorder
  function handleDragStart(index: number) { setDragIdx(index); }
  function handleDragOver(e: React.DragEvent, index: number) { e.preventDefault(); if (dragIdx === null || dragIdx === index) return; setSteps((prev) => { const next = [...prev]; const [moved] = next.splice(dragIdx, 1); next.splice(index, 0, moved); return next; }); setDragIdx(index); }
  function handleDragEnd() { setDragIdx(null); }

  if (loading) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  if (!sequence) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Sequence not found</p></div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/sequences")} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition">&larr; Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{sequence.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sequence.status]}`}>{sequence.status}</span>
              <span className="text-xs text-gray-400">{GOAL_LABELS[sequence.goal]}</span>
              <span className="text-xs text-gray-400">{steps.length} steps</span>
              <span className="text-xs text-gray-400">{sequence._count.enrollments} enrolled</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleStatusToggle} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${sequence.status === "ACTIVE" ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" : "bg-green-600 text-white hover:bg-green-700"}`}>
            {sequence.status === "ACTIVE" ? "Pause" : "Activate"}
          </button>
          {sequence.status !== "ACTIVE" && (
            <button onClick={handleDelete} className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">Delete</button>
          )}
        </div>
      </div>

      {/* Configuration summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Trigger */}
          <div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Enrollment Trigger</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {TRIGGER_LABELS[sequence.enrollmentTrigger] || sequence.enrollmentTrigger}
              </span>
            </div>
            {sequence.enrollmentTrigger === "LEAD_CREATED" && sequence.triggerConfig?.source && (
              <div className="mt-1 text-xs text-gray-500">
                Source: <span className="font-medium text-gray-700 dark:text-gray-300">{SOURCE_LABELS[sequence.triggerConfig.source] || sequence.triggerConfig.source}</span>
              </div>
            )}
            {sequence.enrollmentTrigger === "STAGE_CHANGE" && (
              <div className="mt-1 text-xs text-gray-500">
                {sequence.triggerConfig?.fromStage && <span>{sequence.triggerConfig.fromStage}</span>}
                {sequence.triggerConfig?.fromStage && sequence.triggerConfig?.toStage && <span> → </span>}
                {sequence.triggerConfig?.toStage && <span>{sequence.triggerConfig.toStage}</span>}
                {!sequence.triggerConfig?.fromStage && !sequence.triggerConfig?.toStage && <span>Any stage change</span>}
              </div>
            )}
            {sequence.enrollmentTrigger === "ADDED_TO_LIST" && sequence.triggerList && (
              <div className="mt-1 text-xs text-gray-500">
                List: <span className="font-medium text-gray-700 dark:text-gray-300">{sequence.triggerList.name}</span>
              </div>
            )}
          </div>

          {/* Goal */}
          <div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Goal</span>
            <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{GOAL_LABELS[sequence.goal]}</div>
          </div>

          {/* Exit Conditions */}
          <div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Exit When</span>
            <div className="mt-1 space-y-0.5">
              {sequence.exitConditions.length > 0 ? sequence.exitConditions.map((ec) => (
                <div key={ec} className="text-xs text-gray-500">{EXIT_LABELS[ec] || ec}</div>
              )) : (
                <div className="text-xs text-gray-400">No exit conditions</div>
              )}
            </div>
          </div>

          {/* Re-enrollment */}
          <div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Re-enrollment</span>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {sequence.reEnrollAfterDays ? `After ${sequence.reEnrollAfterDays} days` : "Disabled"}
            </div>
            {sequence.audienceTags && (sequence.audienceTags as string[]).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(sequence.audienceTags as string[]).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(["steps", "contacts", "preview", "performance"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Steps Tab ── */}
      {tab === "steps" && (
        <div>
          <div className="space-y-3 mb-6">
            {steps.map((step, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className={`bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 transition ${dragIdx === i ? "opacity-50 border-indigo-400" : "hover:border-indigo-200 dark:hover:border-indigo-800"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="cursor-grab text-gray-300 hover:text-gray-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                    </span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Step {i + 1}</span>
                  </div>
                  <button onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 transition p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Template */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-between">
                      <span>Send Template</span>
                      {step.templateId && (
                        <button
                          type="button"
                          onClick={() => {
                            const tpl = templates.find((t) => t.id === step.templateId);
                            if (tpl) setPreviewTemplate(tpl);
                          }}
                          className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline normal-case"
                        >
                          Preview
                        </button>
                      )}
                    </label>
                    <select value={step.templateId} onChange={(e) => updateStep(i, "templateId", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.title} — {t.subject}</option>)}
                    </select>
                  </div>

                  {/* Wait */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wait</label>
                    <div className="flex gap-2">
                      <input type="number" min="0" value={step.waitValue} onChange={(e) => updateStep(i, "waitValue", parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
                      <select value={step.waitUnit} onChange={(e) => updateStep(i, "waitUnit", e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                        {WAIT_UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Then — If</label>
                    <select value={step.condition} onChange={(e) => updateStep(i, "condition", e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                      {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                    </select>
                  </div>

                  {/* Go to step */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Go to</label>
                    <select value={step.goToStepOrder ?? ""} onChange={(e) => updateStep(i, "goToStepOrder", e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                      <option value="">Next step</option>
                      {steps.map((_, j) => j !== i && <option key={j} value={j + 1}>Step {j + 1}</option>)}
                    </select>
                  </div>
                </div>

                {/* Step-level exit (collapsible) */}
                {step.exitOnCondition !== null ? (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-red-500 font-medium">Exit if:</span>
                    <select value={step.exitOnCondition || ""} onChange={(e) => updateStep(i, "exitOnCondition", e.target.value || null)} className="px-2 py-1 text-xs border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20">
                      {CONDITION_OPTIONS.filter((c) => c !== "ALWAYS").map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
                    </select>
                    <button onClick={() => updateStep(i, "exitOnCondition", null)} className="text-xs text-gray-400 hover:text-gray-600">remove</button>
                  </div>
                ) : (
                  <button onClick={() => updateStep(i, "exitOnCondition", "REPLIED")} className="mt-2 text-xs text-gray-400 hover:text-indigo-600 transition">+ Add step-level exit condition</button>
                )}
              </div>
            ))}

            {steps.length > 0 && steps.length < 20 && (
              <div className="flex justify-center">
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={addStep} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Step
            </button>
            {steps.length > 0 && (
              <button onClick={handleSaveSteps} disabled={saving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
                {saving ? "Saving..." : "Save Steps"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Contacts Tab ── */}
      {tab === "contacts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{enrollTotal} enrolled contact{enrollTotal !== 1 ? "s" : ""}</p>
            <button onClick={() => setShowEnrollModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">+ Enroll Contacts</button>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400 mb-2">No contacts enrolled yet</p>
              <button onClick={() => setShowEnrollModal(true)} className="text-indigo-600 text-sm font-medium hover:underline">Enroll your first contacts</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Step</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Action</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Send</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{e.lead.customerName}</div>
                        <div className="text-xs text-gray-400">{e.lead.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">{e.currentStepOrder}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{ACTION_LABELS[e.lastAction] || e.lastAction}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.nextSendAt ? new Date(e.nextSendAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ENROLLMENT_COLORS[e.status] || "bg-gray-100 text-gray-800"}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {e.status === "ACTIVE" && <button onClick={() => handleEnrollmentAction(e.id, "pause")} className="text-xs text-yellow-600 hover:underline">Pause</button>}
                          {e.status === "PAUSED" && <button onClick={() => handleEnrollmentAction(e.id, "resume")} className="text-xs text-green-600 hover:underline">Resume</button>}
                          {(e.status === "ACTIVE" || e.status === "PAUSED") && (
                            <>
                              <span className="text-gray-300">|</span>
                              <button onClick={() => handleEnrollmentAction(e.id, "advance")} className="text-xs text-indigo-600 hover:underline">Advance</button>
                              <span className="text-gray-300">|</span>
                              <button onClick={() => handleEnrollmentAction(e.id, "remove")} className="text-xs text-red-600 hover:underline">Remove</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Enroll Modal */}
          {showEnrollModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowEnrollModal(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Enroll Contacts</h3>
                  <button onClick={() => setShowEnrollModal(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="px-6 py-4">
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchLeads()} placeholder="Search leads by name, email, company..." className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
                    <button onClick={handleSearchLeads} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">Search</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {searchResults.map((lead) => (
                      <label key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => setSelectedLeads((prev) => { const next = new Set(prev); next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id); return next; })} className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.customerName}</div>
                          <div className="text-xs text-gray-400">{lead.customerEmail} — {lead.projectName}</div>
                        </div>
                      </label>
                    ))}
                    {searchResults.length === 0 && enrollSearch && <p className="text-sm text-gray-400 text-center py-4">No results. Type a name or email and click Search.</p>}
                  </div>
                </div>
                <div className="px-6 py-3 border-t dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{selectedLeads.size} selected</span>
                  <button onClick={handleEnrollSelected} disabled={selectedLeads.size === 0 || enrolling} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                    {enrolling ? "Enrolling..." : `Enroll ${selectedLeads.size} Contact${selectedLeads.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Preview Tab ── */}
      {tab === "preview" && (
        <div>
          {!preview ? (
            <p className="text-gray-400">Loading preview...</p>
          ) : preview.stepCount === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400">Add steps to see the preview.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 max-w-2xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{preview.name}</h3>
              <p className="text-xs text-gray-400 mb-6">{GOAL_LABELS[preview.goal]} — {preview.stepCount} steps</p>
              <div className="space-y-0">
                {preview.preview.map((line, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${line.startsWith("Exit") ? "bg-red-400" : "bg-indigo-400"} shrink-0 mt-1.5`} />
                      {i < preview.preview.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />}
                    </div>
                    <p className={`text-sm pb-4 ${line.startsWith("Exit") ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>{line}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Performance Tab ── */}
      {tab === "performance" && (
        <div>
          {!perf ? (
            <p className="text-gray-400">Loading performance data...</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {[
                  { label: "Total Enrolled", value: perf.summary.totalEnrolled, color: "text-gray-900 dark:text-white" },
                  { label: "Active", value: perf.summary.active, color: "text-green-600" },
                  { label: "Completed", value: perf.summary.completed, color: "text-blue-600" },
                  { label: "Exited", value: perf.summary.exited, color: "text-purple-600" },
                  { label: "Removed", value: perf.summary.removed, color: "text-red-600" },
                  { label: "Paused", value: perf.summary.paused, color: "text-yellow-600" },
                  { label: "Conversion", value: `${perf.summary.conversionRate}%`, color: "text-indigo-600" },
                ].map((card) => (
                  <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Per-step funnel */}
              {perf.stepStats.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-3 border-b dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Drop-off by Step</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Step</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Template</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Reached</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Currently At</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Drop-off</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {perf.stepStats.map((s, i) => {
                        const prevReached = i > 0 ? perf.stepStats[i - 1].reached : perf.summary.totalEnrolled;
                        const dropoff = prevReached > 0 ? Math.round(((prevReached - s.reached) / prevReached) * 100) : 0;
                        return (
                          <tr key={s.stepOrder}>
                            <td className="px-6 py-3"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{s.stepOrder}</span></td>
                            <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{s.templateTitle}</td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{s.reached}</td>
                            <td className="px-6 py-3 text-sm text-gray-500">{s.currentlyAt}</td>
                            <td className="px-6 py-3">
                              {i > 0 && dropoff > 0 ? (
                                <span className="text-sm text-red-500 font-medium">-{dropoff}%</span>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email Preview</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{previewTemplate.title}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Subject</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{mergeSample(previewTemplate.subject)}</p>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900">
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#333;background:#fff}img{max-width:100%}a{color:#2563eb}</style></head><body>${mergeSample(previewTemplate.body)}</body></html>`}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                style={{ minHeight: 400 }}
                title="Email Preview"
              />
            </div>
            <div className="p-3 border-t dark:border-gray-700 flex justify-between items-center">
              <p className="text-[10px] text-gray-400">Sample values shown for personalization tags.</p>
              <button
                onClick={() => router.push(`/email-templates/${previewTemplate.id}`)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Edit template →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
