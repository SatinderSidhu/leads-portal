"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FILTER_FIELDS = [
  { value: "industry", label: "Industry" },
  { value: "jobTitle", label: "Job Title" },
  { value: "companyName", label: "Company Name" },
  { value: "companySize", label: "Company Size" },
  { value: "stage", label: "Lead Stage" },
  { value: "source", label: "Lead Source" },
  { value: "location", label: "Location" },
  { value: "city", label: "City" },
  { value: "doNotContact", label: "Do Not Contact" },
  { value: "leadScore", label: "Lead Score" },
  { value: "createdAt", label: "Date Added" },
  { value: "lastContactedDate", label: "Last Contacted" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  text: [{ value: "is", label: "is" }, { value: "is_not", label: "is not" }, { value: "contains", label: "contains" }],
  select: [{ value: "is", label: "is" }, { value: "is_not", label: "is not" }, { value: "is_one_of", label: "is one of" }],
  boolean: [{ value: "is", label: "is" }, { value: "is_not", label: "is not" }],
  number: [{ value: "is", label: "=" }, { value: "gte", label: ">=" }, { value: "lte", label: "<=" }],
  date: [{ value: "is_before", label: "is before" }, { value: "is_after", label: "is after" }, { value: "is_within_last", label: "within last X days" }],
};

function getFieldType(field: string): string {
  if (["stage", "source", "companySize"].includes(field)) return "select";
  if (field === "doNotContact") return "boolean";
  if (field === "leadScore") return "number";
  if (["createdAt", "lastContactedDate"].includes(field)) return "date";
  return "text";
}

const SELECT_OPTIONS: Record<string, string[]> = {
  stage: ["COLD", "WARM", "HOT", "ACTIVE", "NEW", "CONTACTED", "RESPONDED", "MEETING_BOOKED", "QUALIFIED", "DISQUALIFIED", "NURTURE"],
  source: ["MANUAL", "AGENT", "BARK", "LINKEDIN_SALES_NAV", "APOLLO", "LINKEDIN_COMPANY_PAGE", "REFERRAL", "WEBSITE", "COLD_OUTREACH", "EVENT", "SMB_APP_CONTEST_2026", "OTHER"],
  companySize: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"],
};

interface FilterRule {
  field: string;
  operator: string;
  value: string;
  logic: "AND" | "OR";
}

export default function NewListPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [description, setDescription] = useState("");
  const [isSuppression, setIsSuppression] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  function addFilter() {
    setFilters((prev) => [...prev, { field: "industry", operator: "is", value: "", logic: "AND" }]);
  }

  function updateFilter(index: number, updates: Partial<FilterRule>) {
    setFilters((prev) => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePreview() {
    if (filters.length === 0) return;
    setPreviewing(true);
    try {
      // Create temp list, count members, delete
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `__preview_${Date.now()}`, type: "DYNAMIC", filters }),
      });
      if (res.ok) {
        const list = await res.json();
        const refreshRes = await fetch(`/api/lists/${list.id}/refresh`, { method: "POST" });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setPreviewCount(data.totalMatching);
        }
        // Clean up preview list
        await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
      }
    } catch { /* ignore */ }
    finally { setPreviewing(false); }
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          isSuppression,
          filters: type === "DYNAMIC" ? filters : [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // If dynamic, refresh immediately
        if (type === "DYNAMIC" && filters.length > 0) {
          await fetch(`/api/lists/${data.id}/refresh`, { method: "POST" });
        }
        router.push(`/lists/${data.id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create list");
      }
    } catch { alert("Failed to create list"); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/lists")} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition">&larr; Back</button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Contact List</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 max-w-3xl space-y-6">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">List Type *</label>
          <div className="flex gap-3">
            {(["STATIC", "DYNAMIC"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); if (t === "STATIC") setFilters([]); }}
                className={`flex-1 p-4 rounded-xl border-2 transition text-left ${type === t ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{t === "STATIC" ? "Static List" : "Dynamic (Smart) List"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t === "STATIC" ? "Manually curated — you add and remove contacts" : "Rule-based — auto-updates as contacts change"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">List Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "STATIC" ? "e.g. London Conference Contacts" : "e.g. Cold Fintech CTOs"} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this list for?" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-y" />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isSuppression} onChange={(e) => setIsSuppression(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Suppression List</span>
            <p className="text-xs text-gray-400">Members will be excluded from all sequence enrollments</p>
          </div>
        </label>

        {/* Dynamic Filters */}
        {type === "DYNAMIC" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter Rules</label>
              {previewCount !== null && (
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{previewCount} contacts match</span>
              )}
            </div>

            <div className="space-y-3 mb-4">
              {filters.map((f, i) => {
                const fieldType = getFieldType(f.field);
                const ops = OPERATORS[fieldType] || OPERATORS.text;
                return (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {i > 0 && (
                      <select value={f.logic} onChange={(e) => updateFilter(i, { logic: e.target.value as "AND" | "OR" })} className="px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}
                    <select value={f.field} onChange={(e) => updateFilter(i, { field: e.target.value, operator: "is", value: "" })} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {FILTER_FIELDS.map((ff) => <option key={ff.value} value={ff.value}>{ff.label}</option>)}
                    </select>
                    <select value={f.operator} onChange={(e) => updateFilter(i, { operator: e.target.value })} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                    {fieldType === "boolean" ? (
                      <select value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })} className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : fieldType === "select" ? (
                      <select value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })} className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Select...</option>
                        {(SELECT_OPTIONS[f.field] || []).map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
                      </select>
                    ) : (
                      <input type={fieldType === "number" ? "number" : fieldType === "date" ? "date" : "text"} value={f.value} onChange={(e) => updateFilter(i, { value: e.target.value })} placeholder={fieldType === "date" ? "" : "Value..."} className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                    )}
                    <button onClick={() => removeFilter(i)} className="p-1 text-red-400 hover:text-red-600 transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={addFilter} className="flex items-center gap-1.5 px-3 py-2 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:border-emerald-500 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Filter
              </button>
              {filters.length > 0 && (
                <button onClick={handlePreview} disabled={previewing} className="px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 transition disabled:opacity-50">
                  {previewing ? "Counting..." : "Preview Count"}
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? "Creating..." : `Create ${type === "STATIC" ? "Static" : "Dynamic"} List`}
        </button>
      </div>
    </div>
  );
}
