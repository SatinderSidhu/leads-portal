"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const PURPOSE_COLORS: Record<string, string> = {
  WELCOME: "border-green-400 bg-green-50 dark:bg-green-900/30",
  FOLLOW_UP: "border-blue-400 bg-blue-50 dark:bg-blue-900/30",
  REMINDER: "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30",
  NOTIFICATION: "border-purple-400 bg-purple-50 dark:bg-purple-900/30",
  PROMOTIONAL: "border-pink-400 bg-pink-50 dark:bg-pink-900/30",
  OTHER: "border-gray-400 bg-gray-50 dark:bg-gray-800",
};

const PURPOSE_BADGE: Record<string, string> = {
  WELCOME: "bg-green-100 text-green-700",
  FOLLOW_UP: "bg-blue-100 text-blue-700",
  REMINDER: "bg-yellow-100 text-yellow-700",
  NOTIFICATION: "bg-purple-100 text-purple-700",
  PROMOTIONAL: "bg-pink-100 text-pink-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const PURPOSE_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  FOLLOW_UP: "Follow Up",
  REMINDER: "Reminder",
  NOTIFICATION: "Notification",
  PROMOTIONAL: "Promotional",
  OTHER: "Other",
};

interface EmailTemplateItem {
  id: string;
  title: string;
  subject: string;
  purpose: string;
}

interface EmailNodeData {
  templateId: string;
  templateTitle: string;
  templateSubject: string;
  purpose: string;
  [key: string]: unknown;
}

function EmailNode({ data }: NodeProps<Node<EmailNodeData>>) {
  const purpose = (data.purpose as string) || "OTHER";
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-sm min-w-[200px] max-w-[260px] ${PURPOSE_COLORS[purpose] || PURPOSE_COLORS.OTHER}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
        {data.templateTitle as string}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
        {data.templateSubject as string}
      </div>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PURPOSE_BADGE[purpose] || PURPOSE_BADGE.OTHER}`}
      >
        {PURPOSE_LABELS[purpose] || purpose}
      </span>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = { emailNode: EmailNode };

interface FlowBuilderProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  saving: boolean;
}

export default function FlowBuilder({
  initialNodes,
  initialEdges,
  onSave,
  saving,
}: FlowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/email-templates")
      .then((res) => res.json())
      .then(setTemplates);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      const label = window.prompt(
        "Edge label (e.g. 'Customer accepts', 'No response'):",
        ""
      );
      const edge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        label: label || undefined,
        type: "smoothstep",
        style: { strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const addTemplateNode = useCallback(
    (template: EmailTemplateItem) => {
      const newNode: Node<EmailNodeData> = {
        id: `node-${template.id}-${Date.now()}`,
        type: "emailNode",
        position: {
          x: 250 + Math.random() * 200,
          y: 100 + nodes.length * 120,
        },
        data: {
          templateId: template.id,
          templateTitle: template.title,
          templateSubject: template.subject,
          purpose: template.purpose,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  const onEdgeDoubleClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const currentLabel =
        typeof edge.label === "string" ? edge.label : "";
      const newLabel = window.prompt("Edit edge label:", currentLabel);
      if (newLabel === null) return;
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edge.id ? { ...e, label: newLabel || undefined } : e
        )
      );
    },
    [setEdges]
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-200 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Email Templates
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Click to add to canvas
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 p-2">
              No templates created yet
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => addTemplateNode(t)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition"
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {t.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {t.subject}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-3 left-3 z-50 pointer-events-auto">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
          >
            {sidebarOpen ? "Hide Panel" : "Templates"}
          </button>
        </div>
        <div className="absolute top-3 right-3 z-50 pointer-events-auto">
          <button
            onClick={() => onSave(nodes, edges)}
            disabled={saving}
            className="bg-teal-600 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition shadow-sm"
          >
            {saving ? "Saving..." : "Save Flow"}
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Background gap={20} size={1} />
          <Controls className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-600 !shadow-sm" />
          <MiniMap
            className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-600"
            nodeColor="#14b8a6"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
