"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOAL_OPTIONS = [
  { value: "BOOK_MEETING", label: "Book a Meeting" },
  { value: "GET_REPLY", label: "Get a Reply" },
  { value: "DRIVE_PURCHASE", label: "Drive a Purchase" },
  { value: "NURTURE_ONLY", label: "Nurture Only" },
];

const TRIGGER_OPTIONS = [
  { value: "MANUAL", label: "Manual — enroll contacts by hand" },
  { value: "ADDED_TO_LIST", label: "Added to list — auto-enroll when contact joins a list" },
  { value: "STAGE_CHANGE", label: "Stage changes — auto-enroll when lead stage changes" },
  { value: "LEAD_CREATED", label: "New lead created — auto-enroll new leads" },
];

const EXIT_OPTIONS = [
  { value: "REPLIED", label: "Contact replied to any email" },
  { value: "MEETING_BOOKED", label: "Contact booked a meeting" },
  { value: "UNSUBSCRIBED", label: "Contact unsubscribed / Do Not Contact" },
];

const STAGE_OPTIONS = [
  "COLD", "WARM", "HOT", "ACTIVE", "CLOSED", "NEW", "CONTACTED",
  "RESPONDED", "MEETING_BOOKED", "QUALIFIED", "DISQUALIFIED", "NURTURE",
];

export default function NewSequencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("GET_REPLY");
  const [trigger, setTrigger] = useState("MANUAL");
  const [fromStage, setFromStage] = useState("");
  const [toStage, setToStage] = useState("");
  const [triggerListId, setTriggerListId] = useState("");
  const [triggerSource, setTriggerSource] = useState("");
  const [lists, setLists] = useState<{ id: string; name: string; type: string }[]>([]);
  const [audienceTags, setAudienceTags] = useState("");
  const [exitConditions, setExitConditions] = useState<string[]>(["REPLIED"]);
  const [reEnrollDays, setReEnrollDays] = useState("");
  const [saving, setSaving] = useState(false);

  // Load lists when ADDED_TO_LIST trigger is selected
  useState(() => {
    fetch("/api/lists").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setLists(d); }).catch(() => {});
  });

  function toggleExit(value: string) {
    setExitConditions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const triggerConfig = trigger === "STAGE_CHANGE"
        ? { fromStage, toStage }
        : trigger === "ADDED_TO_LIST"
          ? { listId: triggerListId }
          : trigger === "LEAD_CREATED" && triggerSource
            ? { source: triggerSource }
            : {};

      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          goal,
          enrollmentTrigger: trigger,
          triggerConfig,
          triggerListId: trigger === "ADDED_TO_LIST" ? triggerListId : null,
          audienceTags: audienceTags.split(",").map((t) => t.trim()).filter(Boolean),
          exitConditions,
          reEnrollAfterDays: reEnrollDays ? parseInt(reEnrollDays, 10) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/sequences/${data.id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create sequence");
      }
    } catch {
      alert("Failed to create sequence");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/sequences")} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition">
          &larr; Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Smart Sequence</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequence Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. B2B SaaS Lead Nurture"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal *</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          >
            {GOAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrollment Trigger</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          >
            {TRIGGER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {trigger === "STAGE_CHANGE" && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Stage</label>
              <select value={fromStage} onChange={(e) => setFromStage(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                <option value="">Any stage</option>
                {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Stage</label>
              <select value={toStage} onChange={(e) => setToStage(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                <option value="">Any stage</option>
                {STAGE_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
            </div>
          </div>
        )}

        {trigger === "LEAD_CREATED" && (
          <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Lead Source <span className="font-normal text-gray-400">(optional)</span></label>
            <select value={triggerSource} onChange={(e) => setTriggerSource(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700">
              <option value="">All sources (any new lead)</option>
              <option value="APP_FACTORY">App Factory only</option>
              <option value="MANUAL">Manual only</option>
              <option value="APOLLO">Apollo only</option>
              <option value="LINKEDIN_SALES_NAV">LinkedIn Sales Nav only</option>
              <option value="WEBSITE">Website only</option>
              <option value="REFERRAL">Referral only</option>
              <option value="COLD_OUTREACH">Cold Outreach only</option>
              <option value="AGENT">Agent only</option>
              <option value="SMB_APP_CONTEST_2026">SMB App Contest 2026 only</option>
              <option value="SMB_NY_2026">SMB NY 2026 only</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Only leads from this source will be auto-enrolled. Leave blank to enroll all new leads.</p>
          </div>
        )}

        {trigger === "ADDED_TO_LIST" && (
          <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-800">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select List</label>
            <select value={triggerListId} onChange={(e) => setTriggerListId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700">
              <option value="">Select a list...</option>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Contacts added to this list will be automatically enrolled in the sequence.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audience Tags <span className="font-normal text-gray-400">(optional, comma-separated)</span></label>
          <input
            type="text"
            value={audienceTags}
            onChange={(e) => setAudienceTags(e.target.value)}
            placeholder="e.g. saas, enterprise, cold-outreach"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Exit Conditions</label>
          <p className="text-xs text-gray-400 mb-3">When any condition is met, the contact is automatically removed from the sequence.</p>
          <div className="space-y-2">
            {EXIT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exitConditions.includes(opt.value)}
                  onChange={() => toggleExit(opt.value)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Re-enroll After (Days) <span className="font-normal text-gray-400">(optional)</span></label>
          <input
            type="number"
            min="0"
            value={reEnrollDays}
            onChange={(e) => setReEnrollDays(e.target.value)}
            placeholder="e.g. 90 — leave empty to disable re-enrollment"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Creating..." : "Create Sequence & Add Steps"}
        </button>
      </div>
    </div>
  );
}
