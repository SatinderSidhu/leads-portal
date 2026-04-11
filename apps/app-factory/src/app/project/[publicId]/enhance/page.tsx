"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  REQUESTED: { label: "Requested", color: "bg-yellow-100 text-yellow-700", icon: "📝" },
  REVIEWED: { label: "Reviewed", color: "bg-blue-100 text-blue-700", icon: "👀" },
  APPROVED: { label: "Approved", color: "bg-teal-100 text-teal-700", icon: "✅" },
  BUILDING: { label: "Building", color: "bg-orange-100 text-orange-700", icon: "🔨" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700", icon: "🎉" },
};

interface AiDiff {
  summary?: string;
  impactedScreens?: { screen: string; change: string }[];
  newScreens?: { name: string; description: string }[];
  removedScreens?: string[];
  impactedFeatures?: { feature: string; change: string }[];
  newFeatures?: { name: string; description: string; priority: string }[];
  estimatedEffort?: string;
  risks?: string[];
}

interface Enhancement {
  id: string;
  description: string;
  aiDiff: AiDiff | null;
  status: string;
  createdAt: string;
  build: { version: number; status: string } | null;
}

export default function EnhancePage() {
  const { publicId } = useParams() as { publicId: string };
  const [enhancements, setEnhancements] = useState<Enhancement[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEnhancements = useCallback(() => {
    fetch(`/api/projects/${publicId}/enhancements`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEnhancements(d); })
      .finally(() => setLoading(false));
  }, [publicId]);

  useEffect(() => { fetchEnhancements(); }, [fetchEnhancements]);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${publicId}/enhancements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (res.ok) {
        setDescription("");
        fetchEnhancements();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to submit");
      }
    } catch { alert("Failed to submit enhancement."); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this enhancement request?")) return;
    await fetch(`/api/projects/${publicId}/enhancements/${id}`, { method: "DELETE" });
    fetchEnhancements();
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Enhance Your App</h1>
      <p className="text-sm text-gray-500 mb-8">Request changes, new features, or improvements. Our AI will analyze the impact and our team will review and build.</p>

      {/* Request form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">New Enhancement Request</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe what you'd like to change or add... &#10;&#10;Examples:&#10;• Add push notifications when a booking is confirmed&#10;• Change the dashboard to show a weekly view instead of daily&#10;• Add a dark mode toggle in the settings screen&#10;• Remove the social login and only keep email/password"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition resize-y text-sm"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">Our AI will analyze the impact on your existing screens and features</p>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="px-6 py-2.5 bg-[#01358d] text-white rounded-xl text-sm font-semibold hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            {submitting ? "Analyzing..." : "Submit Enhancement"}
          </button>
        </div>
      </div>

      {/* Enhancement history */}
      {loading ? (
        <p className="text-gray-400">Loading enhancements...</p>
      ) : enhancements.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-3xl mb-3">✨</div>
          <p className="text-gray-400 text-sm">No enhancement requests yet. Use the form above to request changes to your app.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Enhancement History ({enhancements.length})</h2>
          {enhancements.map((e) => {
            const config = STATUS_CONFIG[e.status] || STATUS_CONFIG.REQUESTED;
            const isExpanded = expandedId === e.id;
            const diff = e.aiDiff;

            return (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header — always visible */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  className="p-5 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{config.icon}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>{config.label}</span>
                        {e.build && <span className="text-[10px] text-gray-400">Build v{e.build.version}</span>}
                        {diff?.estimatedEffort && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            diff.estimatedEffort === "Low" ? "bg-green-100 text-green-700" :
                            diff.estimatedEffort === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {diff.estimatedEffort} effort
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{e.description}</p>
                      {diff?.summary && <p className="text-xs text-gray-400 mt-1">{diff.summary}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</span>
                      <svg className={`w-4 h-4 text-gray-400 transition ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded: AI impact analysis */}
                {isExpanded && diff && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Impact Analysis</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Impacted screens */}
                      {diff.impactedScreens && diff.impactedScreens.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-medium text-amber-600 uppercase mb-1.5">Modified Screens</h4>
                          <div className="space-y-1.5">
                            {diff.impactedScreens.map((s, i) => (
                              <div key={i} className="p-2 rounded-lg bg-amber-50 text-xs">
                                <div className="font-medium text-amber-800">📱 {s.screen}</div>
                                <div className="text-amber-600 mt-0.5">{s.change}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New screens */}
                      {diff.newScreens && diff.newScreens.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-medium text-green-600 uppercase mb-1.5">New Screens</h4>
                          <div className="space-y-1.5">
                            {diff.newScreens.map((s, i) => (
                              <div key={i} className="p-2 rounded-lg bg-green-50 text-xs">
                                <div className="font-medium text-green-800">+ {s.name}</div>
                                <div className="text-green-600 mt-0.5">{s.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Impacted features */}
                      {diff.impactedFeatures && diff.impactedFeatures.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-medium text-blue-600 uppercase mb-1.5">Modified Features</h4>
                          <div className="space-y-1.5">
                            {diff.impactedFeatures.map((f, i) => (
                              <div key={i} className="p-2 rounded-lg bg-blue-50 text-xs">
                                <div className="font-medium text-blue-800">⚙️ {f.feature}</div>
                                <div className="text-blue-600 mt-0.5">{f.change}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New features */}
                      {diff.newFeatures && diff.newFeatures.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-medium text-green-600 uppercase mb-1.5">New Features</h4>
                          <div className="space-y-1.5">
                            {diff.newFeatures.map((f, i) => (
                              <div key={i} className="p-2 rounded-lg bg-green-50 text-xs">
                                <div className="font-medium text-green-800 flex items-center gap-1.5">
                                  + {f.name}
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    f.priority === "P0" ? "bg-red-100 text-red-700" : f.priority === "P1" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                                  }`}>{f.priority}</span>
                                </div>
                                <div className="text-green-600 mt-0.5">{f.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Risks */}
                    {diff.risks && diff.risks.length > 0 && (
                      <div className="mt-4 p-3 rounded-xl bg-red-50">
                        <h4 className="text-[10px] font-medium text-red-600 uppercase mb-1">Risks & Considerations</h4>
                        <ul className="space-y-0.5">
                          {diff.risks.map((r, i) => (
                            <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                              <span>⚠️</span><span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    {e.status === "REQUESTED" && (
                      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                        <button onClick={() => handleDelete(e.id)} className="text-xs text-red-400 hover:text-red-600 transition">
                          Cancel Request
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded but no diff */}
                {isExpanded && !diff && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400 text-center py-4">Impact analysis not available for this request.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
