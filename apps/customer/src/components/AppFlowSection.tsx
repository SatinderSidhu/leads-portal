"use client";

import { useState, useCallback } from "react";
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

interface WireframeNodeData {
  screenTitle: string;
  description?: string;
  elements?: string[];
  [key: string]: unknown;
}

function WireframeNode({ data }: NodeProps<Node<WireframeNodeData>>) {
  return (
    <div className="bg-white border-2 border-gray-300 rounded-2xl shadow-lg min-w-[200px] max-w-[280px] overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="bg-gray-700 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <div className="w-2 h-2 rounded-full bg-gray-500" />
        </div>
        <p className="text-xs font-semibold text-white truncate flex-1 text-center">
          {data.screenTitle}
        </p>
      </div>
      <div className="px-3 py-2">
        {data.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{data.description}</p>
        )}
        {data.elements && data.elements.length > 0 && (
          <div className="space-y-1">
            {data.elements.map((el, i) => (
              <div key={i} className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-600 truncate">
                {el}
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
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
}

export default function AppFlowSection({ flows, leadId }: AppFlowSectionProps) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-[#01358d] uppercase tracking-wider mb-1">
            App Flow
          </p>
          <h3 className="text-2xl font-bold text-gray-900">
            {selectedFlow?.name || "App Flow"}
          </h3>
          {selectedFlow?.description && (
            <p className="text-gray-500 text-sm mt-1">{selectedFlow.description}</p>
          )}
        </div>
        {flows.length > 1 && (
          <select
            value={selectedFlowId}
            onChange={(e) => setSelectedFlowId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 outline-none"
          >
            {flows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.flowType === "WIREFRAME" ? "Wireframe" : "Basic"})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Flow type badge */}
      <div className="mb-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            selectedFlow?.flowType === "WIREFRAME"
              ? "bg-indigo-100 text-indigo-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {selectedFlow?.flowType === "WIREFRAME" ? "Wireframe Flow" : "Basic Flow"}
        </span>
      </div>

      {/* Read-only ReactFlow canvas */}
      {selectedFlow && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-8" style={{ height: 500 }}>
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
      <div className="border-t border-gray-100 pt-6">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Comments ({flowComments.length})
        </p>

        {flowComments.length > 0 && (
          <div className="space-y-3 mb-6">
            {flowComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-4 border ${
                  comment.authorType === "customer"
                    ? "bg-[#01358d]/5 border-[#01358d]/10"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.authorName}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    comment.authorType === "customer"
                      ? "bg-[#01358d]/10 text-[#01358d]"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {comment.authorType === "customer" ? "You" : "Team"}
                  </span>
                </div>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
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
        <div className="flex gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave a comment or feedback..."
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 outline-none resize-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
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
      </div>
    </div>
  );
}
