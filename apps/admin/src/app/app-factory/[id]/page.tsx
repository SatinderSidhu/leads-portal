"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BUILD_STATUSES = ["SUBMITTED", "IN_REVIEW", "BUILDING", "TESTING", "READY", "DELIVERED"];
const BUILD_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted", IN_REVIEW: "In Review", BUILDING: "Building",
  TESTING: "Testing", READY: "Ready", DELIVERED: "Delivered",
};
const BUILD_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-700", IN_REVIEW: "bg-blue-100 text-blue-700",
  BUILDING: "bg-orange-100 text-orange-700", TESTING: "bg-purple-100 text-purple-700",
  READY: "bg-teal-100 text-teal-700", DELIVERED: "bg-green-100 text-green-700",
};
const STATUS_COLORS: Record<string, string> = {
  IDEATING: "bg-blue-100 text-blue-800", DESIGNING: "bg-purple-100 text-purple-800",
  SUBMITTED: "bg-yellow-100 text-yellow-800", BUILDING: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800", ENHANCING: "bg-indigo-100 text-indigo-800",
};

interface Screen { id: string; name: string; description: string; elements: { type: string; content?: string }[] }
interface Feature { id: string; name: string; description: string; priority: string; screens: string[]; acceptanceCriteria: string[] }
interface Build { id: string; version: number; status: string; submittedAt: string; deliveredAt: string | null; notes: string | null }
interface AppStoreConf { id: string; platform: string; accountId: string | null; bundleId: string | null; connectionVerified: boolean }
interface Flow { id: string; version: number; screens: Screen[]; requirements: { appName?: string; summary?: string; features?: Feature[]; techStack?: string[] }; isFinalized: boolean }

interface Enhancement {
  id: string; description: string; status: string; createdAt: string;
  aiDiff: { summary?: string; estimatedEffort?: string; impactedScreens?: { screen: string; change: string }[]; newScreens?: { name: string }[]; newFeatures?: { name: string }[] } | null;
  build: { version: number } | null;
}

interface Project {
  id: string; publicId: string; status: string; idea: string;
  customerName: string | null; customerEmail: string | null; companyName: string | null;
  leadId: string | null; platforms: string[]; createdAt: string;
  flows: Flow[]; builds: Build[]; appStoreConfigs: AppStoreConf[];
  enhancements: Enhancement[];
}

export default function AppFactoryDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "screens" | "requirements" | "builds" | "stores" | "enhancements">("overview");
  const [buildNotes, setBuildNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProject = useCallback(() => {
    fetch(`/api/app-factory/${id}`).then((r) => r.json()).then((d) => {
      setProject(d);
      if (d.builds?.[0]?.notes) setBuildNotes(d.builds[0].notes);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  async function updateBuildStatus(buildId: string, status: string) {
    setSaving(true);
    await fetch(`/api/app-factory/${id}/builds/${buildId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchProject();
    setSaving(false);
  }

  async function saveBuildNotes(buildId: string) {
    setSaving(true);
    await fetch(`/api/app-factory/${id}/builds/${buildId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: buildNotes }),
    });
    fetchProject();
    setSaving(false);
  }

  if (loading) return <div className="p-6"><p className="text-gray-500">Loading...</p></div>;
  if (!project) return <div className="p-6"><p className="text-gray-500">Project not found</p></div>;

  const latestFlow = project.flows[0];
  const latestBuild = project.builds[0];
  const screens = (latestFlow?.screens || []) as Screen[];
  const requirements = (latestFlow?.requirements || {}) as { appName?: string; summary?: string; features?: Feature[]; techStack?: string[] };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.push("/app-factory")} className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">&larr; Back to App Factory</button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {requirements.appName || project.idea.substring(0, 60)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-800"}`}>{project.status}</span>
            <span className="text-xs text-gray-400">{project.publicId}</span>
            {project.leadId && (
              <a href={`/leads/${project.leadId}`} className="text-xs text-teal-600 hover:underline font-medium">View Lead →</a>
            )}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400">
          <div>{project.customerName || "No name"} — {project.customerEmail || "No email"}</div>
          {project.companyName && <div>{project.companyName}</div>}
          <div>Created {new Date(project.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(["overview", "screens", "requirements", "builds", "enhancements", "stores"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${tab === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
            {t === "stores" ? "App Stores" : t}
            {t === "enhancements" && project.enhancements.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">{project.enhancements.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Original Idea</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{project.idea}</p>
            <div className="flex gap-2 mt-3">
              {(project.platforms as string[]).map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 capitalize">{p}</span>
              ))}
            </div>
          </div>

          {latestBuild && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Latest Build (v{latestBuild.version})</h2>
              <div className="flex items-center gap-3 mb-4">
                <select
                  value={latestBuild.status}
                  onChange={(e) => updateBuildStatus(latestBuild.id, e.target.value)}
                  disabled={saving}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {BUILD_STATUSES.map((s) => <option key={s} value={s}>{BUILD_STATUS_LABELS[s]}</option>)}
                </select>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${BUILD_STATUS_COLORS[latestBuild.status]}`}>
                  {BUILD_STATUS_LABELS[latestBuild.status]}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes to customer</label>
                <textarea
                  value={buildNotes}
                  onChange={(e) => setBuildNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note visible to the customer..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                />
                <button onClick={() => saveBuildNotes(latestBuild.id)} disabled={saving} className="mt-2 px-4 py-1.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 disabled:opacity-50 transition">
                  {saving ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          )}

          {requirements.summary && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{requirements.appName || "Requirements Summary"}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{requirements.summary}</p>
              {requirements.techStack && requirements.techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {requirements.techStack.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Screens ── */}
      {tab === "screens" && (
        <div>
          {screens.length === 0 ? (
            <p className="text-gray-400 py-8 text-center">No screens generated yet</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screens.map((screen) => (
                <div key={screen.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{screen.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{screen.description}</p>
                  <div className="text-xs text-gray-300">
                    {screen.elements?.length || 0} elements
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Requirements ── */}
      {tab === "requirements" && (
        <div>
          {!requirements.features?.length ? (
            <p className="text-gray-400 py-8 text-center">No requirements generated yet</p>
          ) : (
            <div className="space-y-3">
              {requirements.features.map((f) => (
                <div key={f.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">{f.id}</span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.priority === "P0" ? "bg-red-100 text-red-700" : f.priority === "P1" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>{f.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{f.description}</p>
                  {f.acceptanceCriteria?.length > 0 && (
                    <ul className="space-y-0.5">
                      {f.acceptanceCriteria.map((ac, i) => (
                        <li key={i} className="text-xs text-gray-400 flex items-start gap-1"><span className="text-green-500">✓</span>{ac}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Builds ── */}
      {tab === "builds" && (
        <div>
          {project.builds.length === 0 ? (
            <p className="text-gray-400 py-8 text-center">No builds submitted yet</p>
          ) : (
            <div className="space-y-3">
              {project.builds.map((b) => (
                <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">v{b.version}</span>
                    <span className="text-xs text-gray-400 ml-3">Submitted {new Date(b.submittedAt).toLocaleDateString()}</span>
                    {b.deliveredAt && <span className="text-xs text-green-600 ml-3">Delivered {new Date(b.deliveredAt).toLocaleDateString()}</span>}
                    {b.notes && <p className="text-xs text-gray-500 mt-1">{b.notes}</p>}
                  </div>
                  <select
                    value={b.status}
                    onChange={(e) => updateBuildStatus(b.id, e.target.value)}
                    disabled={saving}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {BUILD_STATUSES.map((s) => <option key={s} value={s}>{BUILD_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Enhancements ── */}
      {tab === "enhancements" && (
        <div>
          {project.enhancements.length === 0 ? (
            <p className="text-gray-400 py-8 text-center">No enhancement requests yet</p>
          ) : (
            <div className="space-y-3">
              {project.enhancements.map((e) => (
                <div key={e.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{e.description}</p>
                      {e.aiDiff?.summary && <p className="text-xs text-gray-400 mt-1">{e.aiDiff.summary}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        {e.aiDiff?.estimatedEffort && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            e.aiDiff.estimatedEffort === "Low" ? "bg-green-100 text-green-700" :
                            e.aiDiff.estimatedEffort === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>{e.aiDiff.estimatedEffort} effort</span>
                        )}
                        {e.aiDiff?.impactedScreens && <span className="text-[10px] text-gray-400">{e.aiDiff.impactedScreens.length} screens impacted</span>}
                        {e.aiDiff?.newScreens && e.aiDiff.newScreens.length > 0 && <span className="text-[10px] text-green-600">+{e.aiDiff.newScreens.length} new</span>}
                        {e.build && <span className="text-[10px] text-gray-400">Build v{e.build.version}</span>}
                        <span className="text-[10px] text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <select
                      value={e.status}
                      onChange={async (ev) => {
                        await fetch(`/api/app-factory/${id}/enhancements/${e.id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: ev.target.value }),
                        });
                        fetchProject();
                      }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="REQUESTED">Requested</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="APPROVED">Approved</option>
                      <option value="BUILDING">Building</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── App Stores ── */}
      {tab === "stores" && (
        <div>
          {project.appStoreConfigs.length === 0 ? (
            <p className="text-gray-400 py-8 text-center">No app store accounts configured yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.appStoreConfigs.map((c) => (
                <div key={c.id} className={`rounded-xl border p-4 ${c.connectionVerified ? "border-green-200 bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{c.platform === "IOS" ? "🍎" : "🤖"}</span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{c.platform === "IOS" ? "Apple App Store" : "Google Play Store"}</h3>
                    {c.connectionVerified && <span className="text-xs text-green-600 font-medium">✓ Verified</span>}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div><strong>Account ID:</strong> {c.accountId || "—"}</div>
                    <div><strong>{c.platform === "IOS" ? "Bundle ID" : "Package Name"}:</strong> {c.bundleId || "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
