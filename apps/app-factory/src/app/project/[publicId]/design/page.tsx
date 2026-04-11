"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PrototypePreview from "@/components/PrototypePreview";

// ── Types ──────────────────────────────────────────────────────────

interface Screen {
  id: string;
  name: string;
  description: string;
  elements: { type: string; content?: string; placeholder?: string }[];
  connections?: string[];
  notes?: string;
  linkedFeatures?: string[];
}

interface Feature {
  id: string;
  name: string;
  description: string;
  screens: string[];
  acceptanceCriteria: string[];
  priority: string;
  estimatedComplexity: string;
}

interface Requirements {
  appName?: string;
  summary?: string;
  features?: Feature[];
  techStack?: string[];
  estimatedTimeline?: string;
  platforms?: string[];
}

// ── Color Themes ───────────────────────────────────────────────────

const COLOR_THEMES = [
  { id: "default", name: "KITLabs Blue", primary: "#01358d", accent: "#f9556d", nav: "#01358d", button: "#01358d", bg: "#ffffff" },
  { id: "ocean", name: "Ocean", primary: "#0369a1", accent: "#06b6d4", nav: "#0c4a6e", button: "#0369a1", bg: "#f0f9ff" },
  { id: "forest", name: "Forest", primary: "#166534", accent: "#16a34a", nav: "#14532d", button: "#166534", bg: "#f0fdf4" },
  { id: "sunset", name: "Sunset", primary: "#c2410c", accent: "#f97316", nav: "#7c2d12", button: "#c2410c", bg: "#fff7ed" },
  { id: "purple", name: "Royal Purple", primary: "#7c3aed", accent: "#a855f7", nav: "#581c87", button: "#7c3aed", bg: "#faf5ff" },
  { id: "midnight", name: "Midnight", primary: "#1e293b", accent: "#3b82f6", nav: "#0f172a", button: "#3b82f6", bg: "#f8fafc" },
  { id: "rose", name: "Rose", primary: "#be123c", accent: "#f43f5e", nav: "#881337", button: "#be123c", bg: "#fff1f2" },
  { id: "teal", name: "Teal", primary: "#0f766e", accent: "#14b8a6", nav: "#134e4a", button: "#0f766e", bg: "#f0fdfa" },
];

// ── Element Renderers (theme-aware) ────────────────────────────────

function getRenderers(theme: typeof COLOR_THEMES[0]) {
  const renderers: Record<string, (el: { content?: string; placeholder?: string }) => React.ReactNode> = {
    "nav-bar": (el) => <div style={{ backgroundColor: theme.nav }} className="text-white text-xs font-semibold px-3 py-2 rounded-t-lg">{el.content || "App"}</div>,
    "heading": (el) => <div className="text-sm font-bold px-3 py-1" style={{ color: theme.primary }}>{el.content}</div>,
    "text": (el) => <div className="text-xs text-gray-500 px-3 py-0.5">{el.content}</div>,
    "input": (el) => <div className="mx-3 my-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-400">{el.placeholder || "Input"}</div>,
    "button": (el) => <div className="mx-3 my-1 px-2 py-1.5 text-white text-xs font-medium rounded text-center" style={{ backgroundColor: theme.button }}>{el.content || "Button"}</div>,
    "button-outline": (el) => <div className="mx-3 my-1 px-2 py-1.5 border text-xs font-medium rounded text-center" style={{ borderColor: theme.button, color: theme.button }}>{el.content || "Button"}</div>,
    "image": () => <div className="mx-3 my-1 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-300">Image</div>,
    "avatar": () => <div className="mx-3 my-1 w-8 h-8 rounded-full" style={{ backgroundColor: theme.accent + "40" }} />,
    "search": (el) => <div className="mx-3 my-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-400 flex items-center gap-1"><span>🔍</span>{el.placeholder || "Search..."}</div>,
    "card": (el) => <div className="mx-3 my-1 p-2 border border-gray-200 rounded shadow-sm text-xs text-gray-600">{el.content || "Card"}</div>,
    "list": (el) => <div className="mx-3 my-1 space-y-1">{[1, 2, 3].map((i) => <div key={i} className="p-1.5 border-b border-gray-100 text-xs text-gray-500">{el.content || `Item ${i}`}</div>)}</div>,
    "tab-bar": () => <div className="flex border-t border-gray-200 mt-auto"><div className="flex-1 py-1.5 text-center text-[10px] font-medium" style={{ color: theme.primary }}>Home</div><div className="flex-1 py-1.5 text-center text-[10px] text-gray-400">Search</div><div className="flex-1 py-1.5 text-center text-[10px] text-gray-400">Profile</div></div>,
    "toggle": (el) => <div className="mx-3 my-1 flex items-center justify-between text-xs text-gray-600"><span>{el.content || "Toggle"}</span><div className="w-8 h-4 rounded-full" style={{ backgroundColor: theme.button }} /></div>,
    "divider": () => <div className="mx-3 my-1 border-t border-gray-100" />,
    "social-login": () => <div className="mx-3 my-1 flex gap-2 justify-center">{["G", "F", "A"].map((l) => <div key={l} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-500">{l}</div>)}</div>,
    "map": () => <div className="mx-3 my-1 h-24 bg-green-50 rounded flex items-center justify-center text-xs text-green-400">🗺️ Map</div>,
    "checkbox": (el) => <div className="mx-3 my-1 flex items-center gap-2 text-xs text-gray-600"><div className="w-3.5 h-3.5 border border-gray-300 rounded" />{el.content || "Checkbox"}</div>,
    "radio": (el) => <div className="mx-3 my-1 flex items-center gap-2 text-xs text-gray-600"><div className="w-3.5 h-3.5 border border-gray-300 rounded-full" />{el.content || "Radio"}</div>,
  };
  return renderers;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700", P1: "bg-yellow-100 text-yellow-700", P2: "bg-blue-100 text-blue-700",
};

// ── Main Component ─────────────────────────────────────────────────

export default function DesignPage() {
  const { publicId } = useParams() as { publicId: string };

  // Main state
  const [tab, setTab] = useState<"visual" | "requirements">("visual");
  const [visualView, setVisualView] = useState<"screens" | "flow" | "detail" | "preview">("screens");
  const [screens, setScreens] = useState<Screen[]>([]);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<{ idea: string; status: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  // New feature state
  const [selectedTheme, setSelectedTheme] = useState(COLOR_THEMES[0]);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [screenNote, setScreenNote] = useState("");
  const [editingScreenName, setEditingScreenName] = useState("");

  // Load project
  useEffect(() => {
    fetch(`/api/projects/${publicId}`).then((r) => r.json()).then((p) => {
      setProject(p);
      if (p.flows && p.flows.length > 0) {
        const flow = p.flows[0];
        if (Array.isArray(flow.screens) && flow.screens.length > 0) setScreens(flow.screens);
        if (flow.requirements && typeof flow.requirements === "object" && Object.keys(flow.requirements).length > 0) setRequirements(flow.requirements);
        if (Array.isArray(flow.aiConversationHistory)) setChatHistory(flow.aiConversationHistory);
        setInitialized(true);
      }
    });
  }, [publicId]);

  const generate = useCallback(async (message?: string) => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${publicId}/generate-flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: tab, message }),
      });
      if (res.ok) {
        const data = await res.json();
        if (tab === "visual" && data.screens) setScreens(data.screens);
        if (tab === "requirements" && data.requirements) setRequirements(data.requirements);
        if (data.conversationHistory) setChatHistory(data.conversationHistory);
        setInitialized(true);
      }
    } catch { alert("Generation failed. Please try again."); }
    finally { setGenerating(false); }
  }, [publicId, tab]);

  useEffect(() => {
    if (project && !initialized && project.status === "IDEATING") { generate(); }
  }, [project, initialized, generate]);

  function handleChat() {
    if (!chatInput.trim() || generating) return;
    const msg = chatInput.trim();
    setChatInput("");
    generate(msg);
  }

  function handleScreenChat(screenId: string, message: string) {
    generate(`For screen "${screens.find((s) => s.id === screenId)?.name || screenId}": ${message}`);
  }

  function openScreenDetail(screen: Screen) {
    setSelectedScreen(screen);
    setScreenNote(screen.notes || "");
    setEditingScreenName(screen.name);
    setVisualView("detail");
  }

  function saveScreenChanges() {
    if (!selectedScreen) return;
    setScreens((prev) => prev.map((s) =>
      s.id === selectedScreen.id
        ? { ...s, name: editingScreenName, notes: screenNote }
        : s
    ));
    setSelectedScreen({ ...selectedScreen, name: editingScreenName, notes: screenNote });
  }

  async function handleFinalize() {
    if (!confirm("Finalize this design? You can still make enhancements later.")) return;
    try {
      await fetch(`/api/projects/${publicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });
      window.location.href = `/project/${publicId}/build`;
    } catch { alert("Failed to finalize. Please try again."); }
  }

  // Get linked features for a screen
  function getFeaturesForScreen(screenId: string): Feature[] {
    if (!requirements?.features) return [];
    const screen = screens.find((s) => s.id === screenId);
    return requirements.features.filter((f) =>
      f.screens.some((s) => s === screen?.name || s === screenId)
    );
  }

  // Get linked screens for a feature
  function getScreensForFeature(feature: Feature): Screen[] {
    return screens.filter((s) =>
      feature.screens.some((fs) => fs === s.name || fs === s.id)
    );
  }

  const renderers = getRenderers(selectedTheme);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Design Your App</h1>
        </div>
        <button
          onClick={handleFinalize}
          disabled={generating || (!screens.length && !requirements?.features?.length)}
          className="px-6 py-2.5 rounded-xl bg-[#01358d] text-white font-medium text-sm hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Finalize Design
        </button>
      </div>

      {/* Main view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("visual")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === "visual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            🎨 Visual View
          </button>
          <button onClick={() => setTab("requirements")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === "requirements" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            📋 Requirements View
          </button>
        </div>

        {/* Theme selector — only show in visual view */}
        {tab === "visual" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Theme:</span>
            <div className="flex gap-1.5">
              {COLOR_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme)}
                  title={theme.name}
                  className={`w-6 h-6 rounded-full border-2 transition ${selectedTheme.id === theme.id ? "border-gray-900 scale-110" : "border-transparent hover:border-gray-300"}`}
                  style={{ backgroundColor: theme.primary }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Chat panel (left) ── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ minHeight: 600 }}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">AI Assistant</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {tab === "visual" ? "Describe changes to screens and layouts" : "Describe features and requirements to add or modify"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && !generating && (
              <div className="text-center py-8 text-gray-300 text-sm">
                {initialized ? "Describe a change..." : "Generating your app design..."}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${msg.role === "user" ? "text-white" : "bg-gray-100 text-gray-700"}`} style={msg.role === "user" ? { backgroundColor: selectedTheme.primary } : {}}>
                  {msg.content.length > 200 ? msg.content.substring(0, 200) + "..." : msg.content}
                </div>
              </div>
            ))}
            {generating && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-400 text-xs animate-pulse">
                  {tab === "visual" ? "Designing screens..." : "Writing requirements..."}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                disabled={generating}
                placeholder={tab === "visual" ? "e.g. Add a payment screen..." : "e.g. Add push notification feature..."}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#01358d] disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button onClick={handleChat} disabled={!chatInput.trim() || generating} className="px-4 py-2 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition" style={{ backgroundColor: selectedTheme.primary }}>
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ── Canvas panel (right) ── */}
        <div className="lg:col-span-8">
          {tab === "visual" ? (
            <div>
              {/* Visual sub-tabs */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setVisualView("screens"); setSelectedScreen(null); }} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${visualView === "screens" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  📱 All Screens
                </button>
                <button onClick={() => setVisualView("flow")} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${visualView === "flow" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  🔀 Flow View
                </button>
                <button onClick={() => setVisualView("preview")} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${visualView === "preview" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  ▶️ Preview
                </button>
                {selectedScreen && (
                  <button onClick={() => setVisualView("detail")} className={`px-4 py-2 rounded-lg text-xs font-medium transition ${visualView === "detail" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    📝 {selectedScreen.name}
                  </button>
                )}
              </div>

              {/* ── Screens Grid ── */}
              {visualView === "screens" && (
                screens.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center" style={{ minHeight: 500 }}>
                    <p className="text-sm text-gray-400">{generating ? "Generating your screens..." : "Your app screens will appear here"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                    {screens.map((screen) => {
                      const linkedFeatures = getFeaturesForScreen(screen.id);
                      return (
                        <div
                          key={screen.id}
                          onClick={() => openScreenDetail(screen)}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-400 transition cursor-pointer group"
                        >
                          <div className="p-3" style={{ backgroundColor: selectedTheme.bg }}>
                            <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm" style={{ minHeight: 240 }}>
                              <div className="flex items-center justify-between px-3 py-1 bg-gray-50 text-[8px] text-gray-400">
                                <span>9:41</span><div className="flex gap-1"><span>📶</span><span>🔋</span></div>
                              </div>
                              <div className="flex flex-col">
                                {screen.elements.map((el, i) => {
                                  const renderer = renderers[el.type];
                                  return renderer ? <div key={i}>{renderer(el)}</div> : null;
                                })}
                              </div>
                              <div className="flex justify-center py-2 mt-auto"><div className="w-16 h-1 rounded-full bg-gray-200" /></div>
                            </div>
                          </div>
                          <div className="px-4 py-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-gray-900">{screen.name}</div>
                              <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition">Click to edit</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{screen.description}</div>
                            {screen.notes && <div className="text-[10px] text-amber-600 mt-1">📝 Has notes</div>}
                            {linkedFeatures.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {linkedFeatures.slice(0, 2).map((f) => (
                                  <span key={f.id} className="px-1.5 py-0.5 rounded text-[9px] bg-blue-50 text-blue-600">{f.name}</span>
                                ))}
                                {linkedFeatures.length > 2 && <span className="text-[9px] text-gray-400">+{linkedFeatures.length - 2}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Flow View ── */}
              {visualView === "flow" && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6" style={{ minHeight: 500 }}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Screen Flow</h3>
                  {screens.length === 0 ? (
                    <p className="text-center text-gray-300 py-16">Generate screens first</p>
                  ) : (
                    <div className="space-y-0">
                      {screens.map((screen, i) => {
                        const connections = screen.connections || [];
                        const connectedScreens = connections.map((c) => screens.find((s) => s.id === c)?.name || c).filter(Boolean);

                        return (
                          <div key={screen.id}>
                            {/* Screen node */}
                            <div
                              onClick={() => openScreenDetail(screen)}
                              className="flex items-center gap-4 p-4 rounded-xl border-2 hover:shadow-md transition cursor-pointer"
                              style={{ borderColor: selectedTheme.primary + "30", backgroundColor: selectedTheme.bg }}
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: selectedTheme.primary }}>
                                {screen.id}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900">{screen.name}</div>
                                <div className="text-xs text-gray-400 truncate">{screen.description}</div>
                              </div>
                              <div className="text-xs text-gray-300">{screen.elements.length} elements</div>
                            </div>

                            {/* Connection arrows */}
                            {i < screens.length - 1 && (
                              <div className="flex items-center gap-2 pl-5 py-1">
                                <div className="w-0.5 h-6" style={{ backgroundColor: selectedTheme.primary + "40" }} />
                                {connectedScreens.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {connectedScreens.map((name) => (
                                      <span key={name} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: selectedTheme.accent + "20", color: selectedTheme.accent }}>
                                        → {name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Prototype Preview ── */}
              {visualView === "preview" && (
                <div className="bg-white rounded-2xl border border-gray-200 py-8" style={{ minHeight: 600 }}>
                  {screens.length === 0 ? (
                    <p className="text-center text-gray-300 py-16">Generate screens first to preview</p>
                  ) : (
                    <div>
                      <div className="flex justify-end px-6 mb-4">
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/preview/${publicId}`); alert("Preview link copied!"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          🔗 Copy Share Link
                        </button>
                      </div>
                      <PrototypePreview screens={screens} theme={selectedTheme} />
                    </div>
                  )}
                </div>
              )}

              {/* ── Screen Detail ── */}
              {visualView === "detail" && selectedScreen && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Screen preview */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4" style={{ backgroundColor: selectedTheme.bg }}>
                    <div className="max-w-[280px] mx-auto rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between px-3 py-1 bg-gray-50 text-[8px] text-gray-400">
                        <span>9:41</span><div className="flex gap-1"><span>📶</span><span>🔋</span></div>
                      </div>
                      {selectedScreen.elements.map((el, i) => {
                        const renderer = renderers[el.type];
                        return renderer ? <div key={i}>{renderer(el)}</div> : null;
                      })}
                      <div className="flex justify-center py-3"><div className="w-20 h-1 rounded-full bg-gray-200" /></div>
                    </div>
                  </div>

                  {/* Screen info + editing */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Screen Name</label>
                      <input
                        type="text"
                        value={editingScreenName}
                        onChange={(e) => setEditingScreenName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#01358d] outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-2">{selectedScreen.description}</p>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                      <textarea
                        value={screenNote}
                        onChange={(e) => setScreenNote(e.target.value)}
                        rows={3}
                        placeholder="Add notes about this screen... (visible to your team)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#01358d] outline-none resize-y"
                      />
                    </div>

                    {/* Save button */}
                    <button onClick={saveScreenChanges} className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition" style={{ backgroundColor: selectedTheme.primary }}>
                      Save Changes
                    </button>

                    {/* Linked features */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <h3 className="text-xs font-medium text-gray-500 mb-2">Linked Requirements</h3>
                      {getFeaturesForScreen(selectedScreen.id).length === 0 ? (
                        <p className="text-xs text-gray-300">No requirements linked to this screen yet. Switch to Requirements View to create links.</p>
                      ) : (
                        <div className="space-y-2">
                          {getFeaturesForScreen(selectedScreen.id).map((f) => (
                            <div key={f.id} className="p-2 rounded-lg bg-blue-50 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${PRIORITY_COLORS[f.priority]}`}>{f.priority}</span>
                                <span className="font-medium text-gray-700">{f.name}</span>
                              </div>
                              <p className="text-gray-500 mt-0.5">{f.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Per-screen AI chat */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <h3 className="text-xs font-medium text-gray-500 mb-2">Refine This Screen</h3>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`e.g. Make ${selectedScreen.name} simpler...`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                              handleScreenChat(selectedScreen.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#01358d]"
                        />
                        <button onClick={() => {
                          const input = document.querySelector<HTMLInputElement>('[placeholder^="e.g. Make"]');
                          if (input?.value.trim()) { handleScreenChat(selectedScreen.id, input.value); input.value = ""; }
                        }} className="px-3 py-2 rounded-xl text-white text-xs font-medium" style={{ backgroundColor: selectedTheme.primary }}>
                          Refine
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Requirements View ── */
            <div className="bg-white rounded-2xl border border-gray-200 p-6" style={{ minHeight: 600 }}>
              {!requirements || !requirements.features ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  {generating ? "Writing requirements..." : "Click 'Send' to generate requirements"}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{requirements.appName || "Your App"}</h2>
                    <p className="text-sm text-gray-500 mt-2">{requirements.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requirements.platforms?.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: selectedTheme.primary + "15", color: selectedTheme.primary }}>{p}</span>
                      ))}
                      {requirements.techStack?.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{t}</span>
                      ))}
                      {requirements.estimatedTimeline && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">⏱️ {requirements.estimatedTimeline}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Features ({requirements.features.length})</h3>
                    <div className="space-y-3">
                      {requirements.features.map((feature) => {
                        const linkedScreens = getScreensForFeature(feature);
                        return (
                          <div key={feature.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-400">{feature.id}</span>
                                <h4 className="text-sm font-semibold text-gray-900">{feature.name}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_COLORS[feature.priority] || "bg-gray-100 text-gray-600"}`}>{feature.priority}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">{feature.estimatedComplexity}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">{feature.description}</p>

                            {/* Linked screens */}
                            {linkedScreens.length > 0 && (
                              <div className="mb-2">
                                <span className="text-[10px] font-medium text-gray-400 uppercase">Screens:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {linkedScreens.map((s) => (
                                    <button
                                      key={s.id}
                                      onClick={() => { setTab("visual"); openScreenDetail(s); }}
                                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                                    >
                                      📱 {s.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {feature.screens.length > 0 && linkedScreens.length === 0 && (
                              <div className="mb-2">
                                <span className="text-[10px] font-medium text-gray-400 uppercase">Screens:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {feature.screens.map((s) => (
                                    <span key={s} className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {feature.acceptanceCriteria.length > 0 && (
                              <div>
                                <span className="text-[10px] font-medium text-gray-400 uppercase">Acceptance Criteria:</span>
                                <ul className="mt-1 space-y-0.5">
                                  {feature.acceptanceCriteria.map((ac, i) => (
                                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                                      <span className="text-green-500 mt-0.5">✓</span><span>{ac}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
