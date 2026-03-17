"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Node, Edge } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// --- Read-only node components (duplicated from admin to avoid cross-app imports) ---

interface BasicNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

function BasicNode({ data }: NodeProps<Node<BasicNodeData>>) {
  return (
    <div className="px-4 py-3 bg-white border-2 border-teal-400 rounded-xl shadow-md min-w-[180px] max-w-[260px]">
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <p className="text-sm font-semibold text-gray-900 text-center truncate">{data.label}</p>
      {data.description && (
        <p className="text-xs text-gray-500 text-center mt-1 line-clamp-2">{data.description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

// --- Wireframe Element Renderer ---

interface WireframeElement {
  type: string;
  label?: string;
  content?: string;
  placeholder?: string;
  items?: string[];
}

function renderElement(el: WireframeElement | string, i: number) {
  if (typeof el === "string") {
    return (
      <div key={i} className="bg-gray-100 rounded px-2 py-1.5 text-[10px] text-gray-500 truncate">
        {el}
      </div>
    );
  }

  const label = el.label || el.content || "";

  switch (el.type) {
    case "heading":
      return (
        <div key={i} className="pt-1 pb-0.5">
          <div className="h-3 bg-gray-700 rounded w-3/4 mx-auto" />
          {label && <p className="text-[9px] text-gray-400 text-center mt-0.5 truncate">{label}</p>}
        </div>
      );
    case "text":
      return (
        <div key={i} className="space-y-0.5 py-0.5">
          <div className="h-1.5 bg-gray-200 rounded w-full" />
          <div className="h-1.5 bg-gray-200 rounded w-4/5" />
          {label && <p className="text-[8px] text-gray-400 truncate">{label}</p>}
        </div>
      );
    case "input":
      return (
        <div key={i} className="py-0.5">
          {label && <p className="text-[8px] text-gray-500 mb-0.5 font-medium">{label}</p>}
          <div className="border border-gray-300 rounded h-5 bg-white flex items-center px-1.5">
            <span className="text-[8px] text-gray-300 truncate">{el.placeholder || label || "Enter..."}</span>
          </div>
        </div>
      );
    case "button":
      return (
        <div key={i} className="py-0.5">
          <div className="bg-blue-500 text-white text-[9px] font-semibold rounded h-5 flex items-center justify-center">
            {label || "Button"}
          </div>
        </div>
      );
    case "button-outline":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-blue-500 text-blue-500 text-[9px] font-semibold rounded h-5 flex items-center justify-center">
            {label || "Button"}
          </div>
        </div>
      );
    case "image":
      return (
        <div key={i} className="py-0.5">
          <div className="bg-gray-200 rounded h-14 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          {label && <p className="text-[8px] text-gray-400 text-center mt-0.5 truncate">{label}</p>}
        </div>
      );
    case "icon":
      return (
        <div key={i} className="py-0.5 flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-gray-400">{label ? label.charAt(0).toUpperCase() : "?"}</span>
          </div>
        </div>
      );
    case "divider":
      return <div key={i} className="py-1"><div className="border-t border-gray-200" /></div>;
    case "toggle":
      return (
        <div key={i} className="py-0.5 flex items-center justify-between">
          <span className="text-[9px] text-gray-600 truncate">{label || "Toggle"}</span>
          <div className="w-6 h-3 bg-blue-500 rounded-full relative flex-shrink-0">
            <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
      );
    case "list":
      return (
        <div key={i} className="py-0.5 space-y-0.5">
          {(el.items || [label, label, label]).slice(0, 4).map((item, j) => (
            <div key={j} className="flex items-center gap-1 py-0.5 border-b border-gray-100 last:border-0">
              <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
              <span className="text-[8px] text-gray-500 truncate">{item || "List item"}</span>
            </div>
          ))}
        </div>
      );
    case "card":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-gray-200 rounded p-1.5 bg-gray-50">
            <div className="h-6 bg-gray-200 rounded mb-1" />
            <div className="h-1.5 bg-gray-200 rounded w-3/4 mb-0.5" />
            <div className="h-1.5 bg-gray-200 rounded w-1/2" />
            {label && <p className="text-[8px] text-gray-400 mt-0.5 truncate">{label}</p>}
          </div>
        </div>
      );
    case "nav-bar":
      return (
        <div key={i} className="py-0.5">
          <div className="flex items-center justify-between bg-gray-100 rounded px-2 py-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="text-[9px] font-semibold text-gray-600 truncate">{label || "Navigation"}</span>
            <div className="w-3 h-3 bg-gray-300 rounded-full" />
          </div>
        </div>
      );
    case "tab-bar":
      return (
        <div key={i} className="py-0.5">
          <div className="flex items-center justify-around bg-gray-100 rounded px-1 py-1">
            {(el.items || ["Home", "Search", "Profile"]).slice(0, 5).map((item, j) => (
              <div key={j} className="flex flex-col items-center gap-0.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${j === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                <span className={`text-[7px] ${j === 0 ? "text-blue-500 font-semibold" : "text-gray-400"}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "search":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-gray-300 rounded-full h-5 bg-gray-50 flex items-center px-2 gap-1">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-[8px] text-gray-300 truncate">{el.placeholder || label || "Search..."}</span>
          </div>
        </div>
      );
    case "avatar":
      return (
        <div key={i} className="py-0.5 flex items-center gap-1.5">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-1.5 bg-gray-300 rounded w-3/4 mb-0.5" />
            <div className="h-1 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      );
    case "map":
      return (
        <div key={i} className="py-0.5">
          <div className="bg-green-50 border border-green-200 rounded h-12 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </div>
          {label && <p className="text-[8px] text-gray-400 text-center mt-0.5">{label}</p>}
        </div>
      );
    case "checkbox":
      return (
        <div key={i} className="py-0.5 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-gray-400 rounded-sm flex-shrink-0" />
          <span className="text-[9px] text-gray-600 truncate">{label || "Option"}</span>
        </div>
      );
    case "radio":
      return (
        <div key={i} className="py-0.5 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-gray-400 rounded-full flex-shrink-0" />
          <span className="text-[9px] text-gray-600 truncate">{label || "Option"}</span>
        </div>
      );
    case "social-login":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-gray-300 rounded h-5 flex items-center justify-center gap-1">
            <div className="w-3 h-3 bg-gray-300 rounded-sm" />
            <span className="text-[8px] text-gray-500">{label || "Continue with..."}</span>
          </div>
        </div>
      );
    default:
      return (
        <div key={i} className="bg-gray-100 rounded px-2 py-1.5 text-[10px] text-gray-500 truncate">
          {label || el.type}
        </div>
      );
  }
}

// --- Wireframe Node (Mobile Screen) ---

interface WireframeNodeData {
  screenTitle: string;
  description?: string;
  elements?: (WireframeElement | string)[];
  [key: string]: unknown;
}

function WireframeNode({ data }: NodeProps<Node<WireframeNodeData>>) {
  return (
    <div className="w-[220px] bg-gray-900 rounded-[24px] p-[6px] shadow-xl">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />
      <div className="bg-white rounded-[20px] overflow-hidden flex flex-col min-h-[380px]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-[8px] text-gray-400 font-medium">9:41</span>
          <div className="w-16 h-4 bg-gray-900 rounded-full" />
          <div className="flex items-center gap-0.5">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <rect x="1" y="10" width="4" height="12" rx="1" /><rect x="7" y="7" width="4" height="15" rx="1" /><rect x="13" y="4" width="4" height="18" rx="1" /><rect x="19" y="1" width="4" height="21" rx="1" />
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <rect x="2" y="7" width="18" height="12" rx="2" /><rect x="20" y="10" width="2" height="6" rx="1" />
            </svg>
          </div>
        </div>
        {/* Screen title */}
        <div className="px-3 py-1.5 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-900 text-center truncate">
            {data.screenTitle}
          </p>
        </div>
        {/* Screen body */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-hidden">
          {data.description && (
            <p className="text-[8px] text-gray-400 text-center mb-1">{data.description}</p>
          )}
          {data.elements && data.elements.length > 0 && (
            <div className="space-y-1">
              {data.elements.map((el, i) => renderElement(el, i))}
            </div>
          )}
        </div>
        {/* Home indicator */}
        <div className="flex justify-center pb-1.5 pt-1">
          <div className="w-20 h-1 bg-gray-300 rounded-full" />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white"
      />
    </div>
  );
}

const nodeTypes = {
  basicNode: BasicNode,
  wireframeNode: WireframeNode,
};

// --- Types ---

interface AppFlowComment {
  id: string;
  content: string;
  authorName: string;
  authorType: string;
  createdAt: string;
}

interface AppFlow {
  id: string;
  name: string;
  description: string | null;
  flowType: string;
  nodes: Node[];
  edges: Edge[];
  sharedAt: string | null;
  comments: AppFlowComment[];
}

interface AppFlowSectionProps {
  flows: AppFlow[];
  leadId: string;
  isLoggedIn: boolean;
  returnTo?: string;
}

export default function AppFlowSection({ flows, leadId, isLoggedIn, returnTo }: AppFlowSectionProps) {
  const [selectedFlowId, setSelectedFlowId] = useState<string>(
    flows.length > 0 ? flows[0].id : ""
  );
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<Record<string, AppFlowComment[]>>(
    () => {
      const map: Record<string, AppFlowComment[]> = {};
      for (const f of flows) {
        map[f.id] = f.comments || [];
      }
      return map;
    }
  );
  const [fullScreen, setFullScreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);
  const fullScreenFlowRef = useRef<HTMLDivElement>(null);

  // Branding for PDF footer
  const [branding, setBranding] = useState<{
    companyName: string;
    footerText: string | null;
    copyrightText: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  } | null>(null);
  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, []);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !selectedFlowId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/app-flows/${selectedFlowId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => ({
          ...prev,
          [selectedFlowId]: [...(prev[selectedFlowId] || []), comment],
        }));
        setCommentText("");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [commentText, selectedFlowId]);

  const getFlowElement = useCallback(() => {
    const ref = fullScreen ? fullScreenFlowRef : flowRef;
    return ref.current?.querySelector(".react-flow") as HTMLElement | null;
  }, [fullScreen]);

  const handleDownloadPng = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${selectedFlow?.name || "app-flow"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }, [getFlowElement, selectedFlow]);

  const handleDownloadPdf = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#f9fafb",
        pixelRatio: 2,
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const headerHeight = branding ? 30 : 0;
      const footerHeight = branding ? 25 : 0;
      const pdfW = img.width / 2;
      const pdfH = img.height / 2 + headerHeight + footerHeight;

      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: [pdfW, pdfH],
      });

      // Branded header
      if (branding) {
        pdf.setFontSize(10);
        if (branding.primaryColor) {
          const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(branding.primaryColor);
          if (m) pdf.setTextColor(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
        }
        pdf.text(branding.companyName, 10, 18);
        pdf.setTextColor(0);
      }

      pdf.addImage(dataUrl, "PNG", 0, headerHeight, img.width / 2, img.height / 2);

      // Branded footer
      if (branding && (branding.footerText || branding.copyrightText)) {
        pdf.setFontSize(7);
        pdf.setTextColor(130);
        const footerY = pdfH - 8;
        if (branding.footerText) {
          pdf.text(branding.footerText, pdfW / 2, footerY - 6, { align: "center" });
        }
        if (branding.copyrightText) {
          pdf.text(branding.copyrightText, pdfW / 2, footerY, { align: "center" });
        }
        pdf.setTextColor(0);
      }

      pdf.save(`${selectedFlow?.name || "app-flow"}.pdf`);
    } catch {
      // silently fail
    } finally {
      setDownloading(false);
    }
  }, [getFlowElement, selectedFlow, branding]);

  if (flows.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No app flows shared yet.</p>
        <p className="text-gray-400 text-sm mt-1">
          Your team will share the app flow diagrams here once they&apos;re ready.
        </p>
      </div>
    );
  }

  const flowComments = comments[selectedFlowId] || [];

  // Full-screen mode (portal to body to escape backdrop-filter stacking context)
  const fullScreenOverlay = fullScreen && selectedFlow ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedFlow.name}</h3>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              selectedFlow.flowType === "WIREFRAME"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {selectedFlow.flowType === "WIREFRAME" ? "Wireframe" : "Basic"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={downloading}
            className="px-4 py-2 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            {downloading ? "Exporting..." : "Download PNG"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-4 py-2 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            Download PDF
          </button>
          <button
            onClick={() => setFullScreen(false)}
            className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Exit Full Screen
          </button>
        </div>
      </div>
      <div className="flex-1 relative" ref={fullScreenFlowRef} style={{ minHeight: 0 }}>
        <div className="absolute inset-0">
          <ReactFlow
            key="fullscreen"
            nodes={selectedFlow.nodes}
            edges={selectedFlow.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            fitView
            className="bg-gray-50"
          >
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} className="!bg-white" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
    {fullScreenOverlay}
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">
            App Flow
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedFlow?.name || "App Flow"}
          </h3>
          {selectedFlow?.description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{selectedFlow.description}</p>
          )}
        </div>
        {flows.length > 1 && (
          <select
            value={selectedFlowId}
            onChange={(e) => setSelectedFlowId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
          >
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.flowType === "WIREFRAME" ? "Wireframe" : "Basic"})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Flow type badge + action buttons */}
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedFlow?.flowType === "WIREFRAME"
              ? "bg-indigo-100 text-indigo-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {selectedFlow?.flowType === "WIREFRAME" ? "Wireframe Flow" : "Basic Flow"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={downloading}
            className="px-3 py-1.5 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            {downloading ? "Exporting..." : "PNG"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="px-3 py-1.5 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition"
          >
            PDF
          </button>
          <button
            onClick={() => setFullScreen(true)}
            className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Full Screen
          </button>
        </div>
      </div>

      {/* Read-only ReactFlow canvas */}
      {selectedFlow && (
        <div
          ref={flowRef}
          className="border border-gray-200 rounded-xl overflow-hidden mb-8"
          style={{ height: 500 }}
        >
          <ReactFlow
            nodes={selectedFlow.nodes}
            edges={selectedFlow.edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            fitView
            className="bg-gray-50"
          >
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} className="!bg-white" />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      )}

      {/* Comments Section */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Comments ({flowComments.length})
        </p>

        {flowComments.length > 0 && (
          <div className="space-y-3 mb-6">
            {flowComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-4 border ${
                  comment.authorType === "customer"
                    ? "bg-[#01358d]/5 border-[#01358d]/10 dark:bg-blue-900/20 dark:border-blue-800/30"
                    : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.authorName}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    comment.authorType === "customer"
                      ? "bg-[#01358d]/10 text-[#01358d] dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {comment.authorType === "customer" ? "You" : "Team"}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                  {comment.content}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment form */}
        {isLoggedIn ? (
          <>
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment or feedback..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                className="px-4 py-2 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition self-end"
              >
                {submitting ? "Sending..." : "Comment"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Cmd+Enter to submit</p>
          </>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <a href={`/login${returnTo ? `?returnTo=${returnTo}` : ""}`} className="text-[#01358d] dark:text-blue-400 font-medium hover:underline">Sign in</a> to leave comments on this app flow.
            </p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
