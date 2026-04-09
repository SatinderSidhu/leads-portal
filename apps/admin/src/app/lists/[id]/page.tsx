"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const TYPE_COLORS: Record<string, string> = { STATIC: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", DYNAMIC: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" };

interface ListData {
  id: string; name: string; type: string; description: string | null; isSuppression: boolean;
  filters: { field: string; operator: string; value: string; logic: string }[];
  lastRefreshedAt: string | null; createdBy: string | null; createdAt: string;
  _count: { members: number };
  triggeredSequences: { id: string; name: string; status: string; _count: { enrollments: number } }[];
}
interface Member { id: string; leadId: string; source: string; addedAt: string; lead: { id: string; customerName: string; customerEmail: string; companyName: string | null; jobTitle: string | null; industry: string | null; stage: string } }
interface Sequence { id: string; name: string; status: string; goal: string }

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tab, setTab] = useState<"contacts" | "sequences" | "settings">("contacts");
  const [list, setList] = useState<ListData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add contacts modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; customerName: string; customerEmail: string; projectName: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Enroll in sequence modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollSeqId, setEnrollSeqId] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollResult, setEnrollResult] = useState<{ enrolled: number; skippedDnc: number; skippedSuppressed: number; skippedExisting: number } | null>(null);

  // Settings
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchList = useCallback(() => {
    fetch(`/api/lists/${id}`).then((r) => r.json()).then((d) => {
      setList(d);
      setEditName(d.name || "");
      setEditDesc(d.description || "");
    }).finally(() => setLoading(false));
  }, [id]);

  const fetchMembers = useCallback(() => {
    fetch(`/api/lists/${id}/members`).then((r) => r.json()).then((d) => {
      setMembers(d.members || []);
      setMemberTotal(d.pagination?.total || 0);
    });
  }, [id]);

  useEffect(() => { fetchList(); fetchMembers(); }, [fetchList, fetchMembers]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetch(`/api/lists/${id}/refresh`, { method: "POST" });
    await fetchList();
    await fetchMembers();
    setRefreshing(false);
  }

  async function handleSearchLeads() {
    if (!addSearch.trim()) return;
    const r = await fetch(`/api/leads?search=${encodeURIComponent(addSearch)}&limit=20`);
    const d = await r.json();
    setSearchResults(d.leads || []);
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;
    setAdding(true);
    await fetch(`/api/lists/${id}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadIds: Array.from(selected) }) });
    setShowAddModal(false); setSelected(new Set()); setSearchResults([]); setAddSearch("");
    await fetchList(); await fetchMembers();
    setAdding(false);
  }

  async function handleRemoveMember(leadId: string) {
    await fetch(`/api/lists/${id}/members?leadId=${leadId}`, { method: "DELETE" });
    await fetchList(); await fetchMembers();
  }

  async function handleEnrollInSequence() {
    if (!enrollSeqId) return;
    setEnrolling(true);
    try {
      const r = await fetch(`/api/lists/${id}/enroll`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sequenceId: enrollSeqId }) });
      if (r.ok) { const d = await r.json(); setEnrollResult(d); }
      else { alert("Failed to enroll"); }
    } catch { alert("Failed to enroll"); }
    finally { setEnrolling(false); }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    await fetch(`/api/lists/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || null }) });
    await fetchList();
    setSavingSettings(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this list? This cannot be undone.")) return;
    const r = await fetch(`/api/lists/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/lists");
  }

  if (loading) return <div className="p-6"><p className="text-gray-500">Loading...</p></div>;
  if (!list) return <div className="p-6"><p className="text-gray-500">List not found</p></div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/lists")} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition">&larr; Back</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{list.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[list.type]}`}>{list.type}</span>
              {list.isSuppression && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Suppression</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span>{list._count.members} contacts</span>
              {list.type === "DYNAMIC" && list.lastRefreshedAt && <span>Refreshed {new Date(list.lastRefreshedAt).toLocaleString()}</span>}
              {list.triggeredSequences.length > 0 && <span>{list.triggeredSequences.length} linked sequence{list.triggeredSequences.length > 1 ? "s" : ""}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {list.type === "DYNAMIC" && (
            <button onClick={handleRefresh} disabled={refreshing} className="px-4 py-2 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition">
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
          <button onClick={handleDelete} className="px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition">Delete</button>
        </div>
      </div>

      {list.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{list.description}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(["contacts", "sequences", "settings"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "sequences" && sequences.length === 0) fetch("/api/sequences").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setSequences(d); }); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Contacts Tab ── */}
      {tab === "contacts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{memberTotal} contact{memberTotal !== 1 ? "s" : ""}</p>
            {list.type === "STATIC" && (
              <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">+ Add Contacts</button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400 mb-2">{list.type === "DYNAMIC" ? "No contacts match the filter rules" : "No contacts added yet"}</p>
              {list.type === "STATIC" && <button onClick={() => setShowAddModal(true)} className="text-emerald-600 text-sm font-medium hover:underline">Add your first contacts</button>}
              {list.type === "DYNAMIC" && <button onClick={handleRefresh} disabled={refreshing} className="text-emerald-600 text-sm font-medium hover:underline">{refreshing ? "Refreshing..." : "Refresh now"}</button>}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Industry</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
                    {list.type === "STATIC" && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => router.push(`/leads/${m.lead.id}`)}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{m.lead.customerName}</div>
                        <div className="text-xs text-gray-400">{m.lead.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.lead.companyName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.lead.jobTitle || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{m.lead.industry || "—"}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{m.lead.stage}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(m.addedAt).toLocaleDateString()}</td>
                      {list.type === "STATIC" && (
                        <td className="px-4 py-3">
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(m.leadId); }} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Contacts Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add Contacts to List</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="px-6 py-4">
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={addSearch} onChange={(e) => setAddSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchLeads()} placeholder="Search by name, email, company..." className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
                    <button onClick={handleSearchLeads} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition">Search</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {searchResults.map((lead) => (
                      <label key={lead.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => setSelected((prev) => { const next = new Set(prev); next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id); return next; })} className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.customerName}</div>
                          <div className="text-xs text-gray-400">{lead.customerEmail} — {lead.projectName}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-3 border-t dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{selected.size} selected</span>
                  <button onClick={handleAddSelected} disabled={selected.size === 0 || adding} className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition">{adding ? "Adding..." : `Add ${selected.size} Contact${selected.size !== 1 ? "s" : ""}`}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sequences Tab ── */}
      {tab === "sequences" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Sequences connected to this list</p>
            <button onClick={() => { setShowEnrollModal(true); setEnrollResult(null); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Enroll List in Sequence</button>
          </div>

          {list.triggeredSequences.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
              <p className="text-gray-400">No sequences linked yet. Use this list as an enrollment trigger on a sequence, or bulk enroll below.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Sequence</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {list.triggeredSequences.map((seq) => (
                    <tr key={seq.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition" onClick={() => router.push(`/sequences/${seq.id}`)}>
                      <td className="px-6 py-4 text-sm font-medium text-indigo-600">{seq.name}</td>
                      <td className="px-6 py-4"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${seq.status === "ACTIVE" ? "bg-green-100 text-green-800" : seq.status === "DRAFT" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>{seq.status}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{seq._count.enrollments}</td>
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
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Enroll All List Members in a Sequence</h3>
                {!enrollResult ? (
                  <>
                    <select value={enrollSeqId} onChange={(e) => setEnrollSeqId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg mb-4 text-gray-900 dark:text-white bg-white dark:bg-gray-700">
                      <option value="">Select a sequence...</option>
                      {sequences.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
                    </select>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowEnrollModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition">Cancel</button>
                      <button onClick={handleEnrollInSequence} disabled={!enrollSeqId || enrolling} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">{enrolling ? "Enrolling..." : `Enroll ${memberTotal} Contacts`}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-green-600 font-medium">{enrollResult.enrolled} contacts enrolled</p>
                      {enrollResult.skippedExisting > 0 && <p className="text-gray-500">{enrollResult.skippedExisting} already in sequence</p>}
                      {enrollResult.skippedDnc > 0 && <p className="text-yellow-600">{enrollResult.skippedDnc} blocked by Do Not Contact</p>}
                      {enrollResult.skippedSuppressed > 0 && <p className="text-red-600">{enrollResult.skippedSuppressed} on suppression list</p>}
                    </div>
                    <button onClick={() => setShowEnrollModal(false)} className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 transition">Done</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Settings Tab ── */}
      {tab === "settings" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">List Name</label>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-y" />
          </div>

          {list.type === "DYNAMIC" && list.filters && (list.filters as { field: string }[]).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Filters</label>
              <div className="space-y-1">
                {(list.filters as { field: string; operator: string; value: string; logic: string }[]).map((f, i) => (
                  <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    {i > 0 && <span className="text-emerald-600 font-medium">{f.logic}</span>}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{f.field}</span>
                    <span className="text-gray-400">{f.operator.replace(/_/g, " ")}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">To change filters, create a new dynamic list.</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
            <button onClick={handleSaveSettings} disabled={savingSettings || !editName.trim()} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition">
              {savingSettings ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="text-xs text-gray-400 pt-2">
            {list.createdBy && <p>Created by {list.createdBy} on {new Date(list.createdAt).toLocaleString()}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
