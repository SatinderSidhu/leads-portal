"use client";

import { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Connection, Edge, Node } from "@xyflow/react";
import { appFlowNodeTypes } from "./app-flow-nodes";

interface AppFlowBuilderProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  flowType: "BASIC" | "WIREFRAME";
  onSave: (nodes: Node[], edges: Edge[]) => void;
  saving: boolean;
  onDownloadPng?: () => void;
}

export default function AppFlowBuilder({
  initialNodes,
  initialEdges,
  flowType,
  onSave,
  saving,
  onDownloadPng,
}: AppFlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeDesc, setNewNodeDesc] = useState("");
  const flowRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: "smoothstep",
        style: { strokeWidth: 2 },
      } as Edge;
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  // Double-click edge to edit label
  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const label = window.prompt("Edge label:", (edge.label as string) || "");
      if (label === null) return;
      setEdges((eds) =>
        eds.map((e) => (e.id === edge.id ? { ...e, label } : e))
      );
    },
    [setEdges]
  );

  // Add node manually
  function handleAddNode() {
    if (!newNodeLabel.trim()) return;

    const nodeType = flowType === "WIREFRAME" ? "wireframeNode" : "basicNode";

    let position: { x: number; y: number };
    if (flowType === "WIREFRAME") {
      const maxX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
      position = { x: maxX + 280, y: 0 };
    } else {
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
      position = { x: 400, y: maxY + 200 };
    }

    const newNode: Node = {
      id: `node-manual-${Date.now()}`,
      type: nodeType,
      position,
      data:
        flowType === "WIREFRAME"
          ? {
              screenTitle: newNodeLabel.trim(),
              description: newNodeDesc.trim() || undefined,
              elements: [],
            }
          : {
              label: newNodeLabel.trim(),
              description: newNodeDesc.trim() || undefined,
            },
    };

    setNodes((nds) => [...nds, newNode]);
    setNewNodeLabel("");
    setNewNodeDesc("");
    setShowAddNode(false);
  }

  // Delete selected nodes on backspace/delete
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        setNodes((nds) => nds.filter((n) => !n.selected));
        setEdges((eds) => eds.filter((e) => !e.selected));
      }
    },
    [setNodes, setEdges]
  );

  return (
    <div className="flex h-full" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Canvas */}
      <div className="flex-1 relative" ref={flowRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={appFlowNodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-white dark:!bg-gray-800"
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* Top-right action buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={() => setShowAddNode(!showAddNode)}
            className="px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            + Add Node
          </button>
          {onDownloadPng && (
            <button
              onClick={onDownloadPng}
              className="px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg shadow-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            >
              Download PNG
            </button>
          )}
          <button
            onClick={() => onSave(nodes, edges)}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg shadow-sm hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Flow"}
          </button>
        </div>

        {/* Add node popover */}
        {showAddNode && (
          <div className="absolute top-16 right-4 z-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl p-4 w-72">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Add New Node
            </p>
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder={
                flowType === "WIREFRAME" ? "Screen title..." : "Step label..."
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNode();
                e.stopPropagation();
              }}
            />
            <input
              type="text"
              value={newNodeDesc}
              onChange={(e) => setNewNodeDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none mb-3"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNode();
                e.stopPropagation();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddNode}
                disabled={!newNodeLabel.trim()}
                className="flex-1 px-3 py-1.5 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddNode(false)}
                className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
