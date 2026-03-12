"use client";

import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";

// --- Basic Node ---

interface BasicNodeData {
  label: string;
  description?: string;
  [key: string]: unknown;
}

export function BasicNode({ data }: NodeProps<Node<BasicNodeData>>) {
  return (
    <div className="px-4 py-3 bg-white dark:bg-gray-800 border-2 border-teal-400 dark:border-teal-600 rounded-xl shadow-md min-w-[180px] max-w-[260px]">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-3 !h-3"
      />
      <p className="text-sm font-semibold text-gray-900 dark:text-white text-center truncate">
        {data.label}
      </p>
      {data.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 line-clamp-2">
          {data.description}
        </p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-3 !h-3"
      />
    </div>
  );
}

// --- Wireframe Node ---

interface WireframeNodeData {
  screenTitle: string;
  description?: string;
  elements?: string[];
  [key: string]: unknown;
}

export function WireframeNode({ data }: NodeProps<Node<WireframeNodeData>>) {
  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-2xl shadow-lg min-w-[200px] max-w-[280px] overflow-hidden">
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-3 !h-3"
      />
      {/* Title bar — mimics a phone status bar */}
      <div className="bg-gray-700 dark:bg-gray-900 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <div className="w-2 h-2 rounded-full bg-gray-500" />
        </div>
        <p className="text-xs font-semibold text-white truncate flex-1 text-center">
          {data.screenTitle}
        </p>
      </div>
      {/* Body */}
      <div className="px-3 py-2">
        {data.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
            {data.description}
          </p>
        )}
        {data.elements && data.elements.length > 0 && (
          <div className="space-y-1">
            {data.elements.map((el, i) => (
              <div
                key={i}
                className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-300 truncate"
              >
                {el}
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-3 !h-3"
      />
    </div>
  );
}

export const appFlowNodeTypes = {
  basicNode: BasicNode,
  wireframeNode: WireframeNode,
};
