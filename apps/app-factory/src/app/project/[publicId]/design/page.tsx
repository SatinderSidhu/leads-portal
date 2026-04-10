"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Screen {
  id: string;
  name: string;
  description: string;
  elements: { type: string; content?: string; placeholder?: string }[];
  connections?: string[];
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

const ELEMENT_RENDERERS: Record<string, (el: { content?: string; placeholder?: string }) => React.ReactNode> = {
  "nav-bar": (el) => <div className="bg-[#01358d] text-white text-xs font-semibold px-3 py-2 rounded-t-lg">{el.content || "App"}</div>,
  "heading": (el) => <div className="text-sm font-bold text-gray-900 px-3 py-1">{el.content}</div>,
  "text": (el) => <div className="text-xs text-gray-500 px-3 py-0.5">{el.content}</div>,
  "input": (el) => <div className="mx-3 my-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-400">{el.placeholder || "Input"}</div>,
  "button": (el) => <div className="mx-3 my-1 px-2 py-1.5 bg-[#01358d] text-white text-xs font-medium rounded text-center">{el.content || "Button"}</div>,
  "button-outline": (el) => <div className="mx-3 my-1 px-2 py-1.5 border border-[#01358d] text-[#01358d] text-xs font-medium rounded text-center">{el.content || "Button"}</div>,
  "image": () => <div className="mx-3 my-1 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-300">Image</div>,
  "avatar": () => <div className="mx-3 my-1 w-8 h-8 rounded-full bg-gray-200" />,
  "search": (el) => <div className="mx-3 my-1 px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-400 flex items-center gap-1"><span>🔍</span>{el.placeholder || "Search..."}</div>,
  "card": (el) => <div className="mx-3 my-1 p-2 border border-gray-200 rounded shadow-sm text-xs text-gray-600">{el.content || "Card"}</div>,
  "list": (el) => <div className="mx-3 my-1 space-y-1">{[1, 2, 3].map((i) => <div key={i} className="p-1.5 border-b border-gray-100 text-xs text-gray-500">{el.content || `Item ${i}`}</div>)}</div>,
  "tab-bar": () => <div className="flex border-t border-gray-200 mt-auto"><div className="flex-1 py-1.5 text-center text-[10px] text-[#01358d] font-medium">Home</div><div className="flex-1 py-1.5 text-center text-[10px] text-gray-400">Search</div><div className="flex-1 py-1.5 text-center text-[10px] text-gray-400">Profile</div></div>,
  "toggle": (el) => <div className="mx-3 my-1 flex items-center justify-between text-xs text-gray-600"><span>{el.content || "Toggle"}</span><div className="w-8 h-4 bg-[#01358d] rounded-full" /></div>,
  "divider": () => <div className="mx-3 my-1 border-t border-gray-100" />,
  "social-login": () => <div className="mx-3 my-1 flex gap-2 justify-center">{["G", "F", "A"].map((l) => <div key={l} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-500">{l}</div>)}</div>,
  "map": () => <div className="mx-3 my-1 h-24 bg-green-50 rounded flex items-center justify-center text-xs text-green-400">🗺️ Map</div>,
  "checkbox": (el) => <div className="mx-3 my-1 flex items-center gap-2 text-xs text-gray-600"><div className="w-3.5 h-3.5 border border-gray-300 rounded" />{el.content || "Checkbox"}</div>,
  "radio": (el) => <div className="mx-3 my-1 flex items-center gap-2 text-xs text-gray-600"><div className="w-3.5 h-3.5 border border-gray-300 rounded-full" />{el.content || "Radio"}</div>,
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-yellow-100 text-yellow-700",
  P2: "bg-blue-100 text-blue-700",
};

export default function DesignPage() {
  const { publicId } = useParams() as { publicId: string };
  const [tab, setTab] = useState<"visual" | "requirements">("visual");
  const [screens, setScreens] = useState<Screen[]>([]);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [project, setProject] = useState<{ idea: string; status: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

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
    } catch {
      alert("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [publicId, tab]);

  // Auto-generate on first load if no existing flow
  useEffect(() => {
    if (project && !initialized && project.status === "IDEATING") {
      generate();
    }
  }, [project, initialized, generate]);

  function handleChat() {
    if (!chatInput.trim() || generating) return;
    const msg = chatInput.trim();
    setChatInput("");
    generate(msg);
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Design Your App</h1>
        </div>
        <button disabled className="px-6 py-2.5 rounded-xl bg-[#01358d] text-white font-medium opacity-50 cursor-not-allowed text-sm">
          Finalize Design
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("visual")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === "visual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          🎨 Visual View
        </button>
        <button onClick={() => setTab("requirements")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${tab === "requirements" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          📋 Requirements View
        </button>
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

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatHistory.length === 0 && !generating && (
              <div className="text-center py-8 text-gray-300 text-sm">
                {initialized ? "Describe a change..." : "Generating your app design..."}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${msg.role === "user" ? "bg-[#01358d] text-white" : "bg-gray-100 text-gray-700"}`}>
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

          {/* Chat input */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChat()}
                disabled={generating}
                placeholder={tab === "visual" ? "e.g. Make the login screen simpler..." : "e.g. Add a payment feature with Stripe..."}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#01358d] disabled:bg-gray-50 disabled:text-gray-400"
              />
              <button
                onClick={handleChat}
                disabled={!chatInput.trim() || generating}
                className="px-4 py-2 bg-[#01358d] text-white rounded-xl text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* ── Canvas panel (right) ── */}
        <div className="lg:col-span-8">
          {tab === "visual" ? (
            /* ── Visual View: Screen mockups ── */
            <div>
              {screens.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center" style={{ minHeight: 600 }}>
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                  <p className="text-sm text-gray-400 font-medium">{generating ? "Generating your screens..." : "Your app screens will appear here"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {screens.map((screen) => (
                    <div key={screen.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-[#01358d]/30 transition group">
                      {/* Phone frame */}
                      <div className="bg-gray-50 p-3">
                        <div className="w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm" style={{ minHeight: 280 }}>
                          {/* Status bar */}
                          <div className="flex items-center justify-between px-3 py-1 bg-gray-50 text-[8px] text-gray-400">
                            <span>9:41</span>
                            <div className="flex gap-1"><span>📶</span><span>🔋</span></div>
                          </div>
                          {/* Screen elements */}
                          <div className="flex flex-col">
                            {screen.elements.map((el, i) => {
                              const renderer = ELEMENT_RENDERERS[el.type];
                              return renderer ? <div key={i}>{renderer(el)}</div> : <div key={i} className="mx-3 my-0.5 text-[10px] text-gray-300">[{el.type}]</div>;
                            })}
                          </div>
                          {/* Home indicator */}
                          <div className="flex justify-center py-2 mt-auto">
                            <div className="w-16 h-1 rounded-full bg-gray-200" />
                          </div>
                        </div>
                      </div>
                      {/* Screen info */}
                      <div className="px-4 py-3 border-t border-gray-100">
                        <div className="text-sm font-semibold text-gray-900">{screen.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{screen.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Requirements View: Structured SOW ── */
            <div className="bg-white rounded-2xl border border-gray-200 p-6" style={{ minHeight: 600 }}>
              {!requirements || !requirements.features ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  {generating ? "Writing requirements..." : "Click 'Send' or switch to Requirements View to generate"}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{requirements.appName || "Your App"}</h2>
                    <p className="text-sm text-gray-500 mt-2">{requirements.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {requirements.platforms?.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#01358d]/10 text-[#01358d] capitalize">{p}</span>
                      ))}
                      {requirements.techStack?.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{t}</span>
                      ))}
                      {requirements.estimatedTimeline && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">⏱️ {requirements.estimatedTimeline}</span>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Features ({requirements.features.length})</h3>
                    <div className="space-y-3">
                      {requirements.features.map((feature) => (
                        <div key={feature.id} className="border border-gray-200 rounded-xl p-4 hover:border-[#01358d]/30 transition">
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

                          {feature.screens.length > 0 && (
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
                                    <span className="text-green-500 mt-0.5">✓</span>
                                    <span>{ac}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
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
