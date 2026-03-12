"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "../../../../components/ThemeToggle";
import dynamic from "next/dynamic";
import type { Node, Edge } from "@xyflow/react";

const AppFlowBuilder = dynamic(
  () => import("../../../../components/AppFlowBuilder"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    ),
  }
);

const APP_TYPES = [
  "Web Application",
  "Mobile App (iOS/Android)",
  "Web + Mobile",
  "E-commerce",
  "SaaS Platform",
  "Dashboard / Admin Panel",
  "Social / Community Platform",
  "Marketplace",
];

interface LeadData {
  id: string;
  projectName: string;
  customerName: string;
  projectDescription: string;
}

interface AppFlowItem {
  id: string;
  name: string;
  flowType: "BASIC" | "WIREFRAME";
  nodes: Node[];
  edges: Edge[];
  sharedAt: string | null;
}

export default function AppFlowBuilderPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const leadId = params.id;
  const editFlowId = searchParams.get("flowId");

  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [flowName, setFlowName] = useState("");
  const [appType, setAppType] = useState("");
  const [flowType, setFlowType] = useState<"BASIC" | "WIREFRAME">("BASIC");
  const [projectDescription, setProjectDescription] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Flow data
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(editFlowId);

  // Existing flows for selector
  const [existingFlows, setExistingFlows] = useState<AppFlowItem[]>([]);

  // State
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  // Fetch lead data
  useEffect(() => {
    async function fetchLead() {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (res.ok) {
          const data = await res.json();
          setLead(data);
          setProjectDescription(data.projectDescription || "");
          if (!flowName) setFlowName(`${data.projectName} - App Flow`);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [leadId]);

  // Fetch existing flows
  useEffect(() => {
    async function fetchFlows() {
      try {
        const res = await fetch(`/api/leads/${leadId}/app-flows`);
        if (res.ok) {
          const data = await res.json();
          setExistingFlows(data);

          // Load specific flow if editing
          if (editFlowId) {
            const flow = data.find((f: AppFlowItem) => f.id === editFlowId);
            if (flow) {
              setFlowName(flow.name);
              setFlowType(flow.flowType);
              setNodes(flow.nodes);
              setEdges(flow.edges);
              setCurrentFlowId(flow.id);
            }
          }
        }
      } catch {
        // ignore
      }
    }
    fetchFlows();
  }, [leadId, editFlowId]);

  // AI Generation
  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/leads/${leadId}/app-flows/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appType,
          flowType,
          projectDescription,
          additionalNotes,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to generate app flow");
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
            if (typeof text === "string" && !text.startsWith("[ERROR]")) {
              accumulated += text;
            } else if (typeof text === "string" && text.startsWith("[ERROR]")) {
              alert(text);
            }
          } catch {
            // skip
          }
        }
      }

      // Parse JSON from accumulated text
      if (accumulated) {
        try {
          // Strip any markdown code fences if present
          let jsonStr = accumulated.trim();
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          const parsed = JSON.parse(jsonStr);
          if (parsed.nodes && parsed.edges) {
            setNodes(parsed.nodes);
            setEdges(parsed.edges);
            setCurrentFlowId(null); // new unsaved content
          } else {
            alert("AI output missing nodes or edges");
          }
        } catch {
          alert("Failed to parse AI response as JSON. Please try again.");
          console.error("Raw AI output:", accumulated);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        alert("Failed to generate app flow");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  // Save flow
  const handleSave = useCallback(
    async (saveNodes: Node[], saveEdges: Edge[]) => {
      if (!flowName.trim()) {
        alert("Flow name is required");
        return;
      }
      setSaving(true);
      try {
        if (currentFlowId) {
          // Update existing
          const res = await fetch(
            `/api/leads/${leadId}/app-flows/${currentFlowId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: flowName.trim(),
                flowType,
                nodes: saveNodes,
                edges: saveEdges,
              }),
            }
          );
          if (!res.ok) {
            const err = await res.json();
            alert(err.error || "Failed to save");
          } else {
            // Update local state
            setNodes(saveNodes);
            setEdges(saveEdges);
          }
        } else {
          // Create new
          const res = await fetch(`/api/leads/${leadId}/app-flows`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: flowName.trim(),
              flowType,
              nodes: saveNodes,
              edges: saveEdges,
            }),
          });
          if (res.ok) {
            const saved = await res.json();
            setCurrentFlowId(saved.id);
            setNodes(saveNodes);
            setEdges(saveEdges);
          } else {
            const err = await res.json();
            alert(err.error || "Failed to save");
          }
        }
        // Refresh flow list
        const listRes = await fetch(`/api/leads/${leadId}/app-flows`);
        if (listRes.ok) setExistingFlows(await listRes.json());
      } catch {
        alert("Failed to save app flow");
      } finally {
        setSaving(false);
      }
    },
    [leadId, currentFlowId, flowName, flowType]
  );

  // Download PNG
  async function handleDownloadPng() {
    const flowElement = flowContainerRef.current?.querySelector(
      ".react-flow__viewport"
    ) as HTMLElement | null;
    if (!flowElement) return;

    const { toPng } = await import("html-to-image");
    try {
      const dataUrl = await toPng(flowElement, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${flowName || "app-flow"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert("Failed to generate PNG");
    }
  }

  // Share with customer
  async function handleShare() {
    let flowId = currentFlowId;
    if (!flowId) {
      // Save first
      if (!flowName.trim() || nodes.length === 0) {
        alert("Please save the flow first");
        return;
      }
      setSaving(true);
      try {
        const res = await fetch(`/api/leads/${leadId}/app-flows`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: flowName.trim(),
            flowType,
            nodes,
            edges,
          }),
        });
        if (!res.ok) {
          alert("Failed to save before sharing");
          setSaving(false);
          return;
        }
        const saved = await res.json();
        flowId = saved.id;
        setCurrentFlowId(saved.id);
      } catch {
        alert("Failed to save before sharing");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    setSharing(true);
    try {
      const res = await fetch(
        `/api/leads/${leadId}/app-flows/${flowId}/share`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.warning) {
          alert(data.warning);
        } else {
          alert("App flow shared with customer! Email sent.");
        }
        const listRes = await fetch(`/api/leads/${leadId}/app-flows`);
        if (listRes.ok) setExistingFlows(await listRes.json());
      } else {
        const err = await res.json();
        alert(err.error || "Failed to share");
      }
    } catch {
      alert("Failed to share app flow");
    } finally {
      setSharing(false);
    }
  }

  // Load existing flow
  function handleLoadFlow(flowId: string) {
    const flow = existingFlows.find((f) => f.id === flowId);
    if (flow) {
      setFlowName(flow.name);
      setFlowType(flow.flowType);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setCurrentFlowId(flow.id);
    }
  }

  const hasNodes = nodes.length > 0;

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[1800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/leads/${leadId}`)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back to Lead
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                App Flow Builder
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {lead.projectName} &middot; {lead.customerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Flow selector */}
            {existingFlows.length > 0 && (
              <select
                value={currentFlowId || ""}
                onChange={(e) =>
                  e.target.value
                    ? handleLoadFlow(e.target.value)
                    : (setCurrentFlowId(null),
                      setNodes([]),
                      setEdges([]),
                      setFlowName(`${lead.projectName} - App Flow`))
                }
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">New Flow</option>
                {existingFlows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.sharedAt ? " - Shared" : ""}
                  </option>
                ))}
              </select>
            )}
            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={!hasNodes || sharing || saving}
              className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5"
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
              {sharing ? "Sharing..." : "Share with Customer"}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — AI generation + settings */}
        <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Flow Name *
            </label>
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Flow Type
            </label>
            <div className="flex gap-2">
              {(["BASIC", "WIREFRAME"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFlowType(t)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    flowType === t
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {t === "BASIC" ? "Basic" : "Wireframe"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              App Type
            </label>
            <select
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select type...</option>
              {APP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Project Description *
            </label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              placeholder="Describe the app..."
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
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              placeholder="Any specific flow requirements..."
            />
          </div>

          {generating ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="w-full py-3 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
              Generating app flow...
            </div>
          )}
        </div>

        {/* Right — Flow canvas */}
        <div className="flex-1" ref={flowContainerRef}>
          {hasNodes ? (
            <AppFlowBuilder
              initialNodes={nodes}
              initialEdges={edges}
              flowType={flowType}
              onSave={handleSave}
              saving={saving}
              onDownloadPng={handleDownloadPng}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4 text-gray-300 dark:text-gray-600">
                  <svg
                    className="w-20 h-20 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={0.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  No flow yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  Fill in the details on the left and click &quot;Generate with
                  AI&quot; to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
