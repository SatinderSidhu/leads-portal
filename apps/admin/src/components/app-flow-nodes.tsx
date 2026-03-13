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

// --- Wireframe Element Renderer ---

interface WireframeElement {
  type: string;
  label?: string;
  content?: string;
  placeholder?: string;
  items?: string[];
  icon?: string;
}

function renderElement(el: WireframeElement | string, i: number) {
  // Backward compatibility: if element is a plain string, render as a generic row
  if (typeof el === "string") {
    return (
      <div
        key={i}
        className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-400 truncate"
      >
        {el}
      </div>
    );
  }

  const label = el.label || el.content || "";

  switch (el.type) {
    case "heading":
      return (
        <div key={i} className="pt-1 pb-0.5">
          <div className="h-3 bg-gray-700 dark:bg-gray-200 rounded w-3/4 mx-auto" />
          {label && (
            <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-0.5 truncate">
              {label}
            </p>
          )}
        </div>
      );

    case "text":
      return (
        <div key={i} className="space-y-0.5 py-0.5">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-full" />
          <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-4/5" />
          {label && (
            <p className="text-[8px] text-gray-400 dark:text-gray-500 truncate">
              {label}
            </p>
          )}
        </div>
      );

    case "input":
      return (
        <div key={i} className="py-0.5">
          {label && (
            <p className="text-[8px] text-gray-500 dark:text-gray-400 mb-0.5 font-medium">
              {label}
            </p>
          )}
          <div className="border border-gray-300 dark:border-gray-500 rounded h-5 bg-white dark:bg-gray-700 flex items-center px-1.5">
            <span className="text-[8px] text-gray-300 dark:text-gray-500 truncate">
              {el.placeholder || label || "Enter..."}
            </span>
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
          <div className="bg-gray-200 dark:bg-gray-600 rounded h-14 flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-gray-400 dark:text-gray-500"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          {label && (
            <p className="text-[8px] text-gray-400 dark:text-gray-500 text-center mt-0.5 truncate">
              {label}
            </p>
          )}
        </div>
      );

    case "icon":
      return (
        <div
          key={i}
          className="py-0.5 flex items-center justify-center"
        >
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-[8px] text-gray-400 dark:text-gray-500">
              {label ? label.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
        </div>
      );

    case "divider":
      return (
        <div key={i} className="py-1">
          <div className="border-t border-gray-200 dark:border-gray-600" />
        </div>
      );

    case "toggle":
      return (
        <div
          key={i}
          className="py-0.5 flex items-center justify-between"
        >
          <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
            {label || "Toggle"}
          </span>
          <div className="w-6 h-3 bg-blue-500 rounded-full relative flex-shrink-0">
            <div className="absolute right-0.5 top-0.5 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>
      );

    case "list":
      return (
        <div key={i} className="py-0.5 space-y-0.5">
          {(el.items || [label, label, label]).slice(0, 4).map((item, j) => (
            <div
              key={j}
              className="flex items-center gap-1 py-0.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
              <span className="text-[8px] text-gray-500 dark:text-gray-400 truncate">
                {item || "List item"}
              </span>
            </div>
          ))}
        </div>
      );

    case "card":
      return (
        <div
          key={i}
          className="py-0.5"
        >
          <div className="border border-gray-200 dark:border-gray-600 rounded p-1.5 bg-gray-50 dark:bg-gray-700/50">
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded mb-1" />
            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-0.5" />
            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
            {label && (
              <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {label}
              </p>
            )}
          </div>
        </div>
      );

    case "nav-bar":
      return (
        <div key={i} className="py-0.5">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-300 truncate">
              {label || "Navigation"}
            </span>
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-500 rounded-full" />
          </div>
        </div>
      );

    case "tab-bar":
      return (
        <div key={i} className="py-0.5">
          <div className="flex items-center justify-around bg-gray-100 dark:bg-gray-700 rounded px-1 py-1">
            {(el.items || ["Home", "Search", "Profile"]).slice(0, 5).map((item, j) => (
              <div key={j} className="flex flex-col items-center gap-0.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${j === 0 ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-500"}`} />
                <span className={`text-[7px] ${j === 0 ? "text-blue-500 font-semibold" : "text-gray-400 dark:text-gray-500"}`}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "search":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-gray-300 dark:border-gray-500 rounded-full h-5 bg-gray-50 dark:bg-gray-700 flex items-center px-2 gap-1">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-[8px] text-gray-300 dark:text-gray-500 truncate">
              {el.placeholder || label || "Search..."}
            </span>
          </div>
        </div>
      );

    case "avatar":
      return (
        <div key={i} className="py-0.5 flex items-center gap-1.5">
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-500 rounded-full flex-shrink-0 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 dark:text-gray-600">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-1.5 bg-gray-300 dark:bg-gray-500 rounded w-3/4 mb-0.5" />
            <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
          </div>
        </div>
      );

    case "map":
      return (
        <div key={i} className="py-0.5">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded h-12 flex items-center justify-center">
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
          <div className="w-3 h-3 border border-gray-400 dark:border-gray-500 rounded-sm flex-shrink-0" />
          <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
            {label || "Option"}
          </span>
        </div>
      );

    case "radio":
      return (
        <div key={i} className="py-0.5 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-gray-400 dark:border-gray-500 rounded-full flex-shrink-0" />
          <span className="text-[9px] text-gray-600 dark:text-gray-300 truncate">
            {label || "Option"}
          </span>
        </div>
      );

    case "social-login":
      return (
        <div key={i} className="py-0.5">
          <div className="border border-gray-300 dark:border-gray-500 rounded h-5 flex items-center justify-center gap-1">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-500 rounded-sm" />
            <span className="text-[8px] text-gray-500 dark:text-gray-400">
              {label || "Continue with..."}
            </span>
          </div>
        </div>
      );

    default:
      // Fallback for unknown types
      return (
        <div
          key={i}
          className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-500 dark:text-gray-400 truncate"
        >
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

export function WireframeNode({ data }: NodeProps<Node<WireframeNodeData>>) {
  return (
    <div className="w-[220px] bg-gray-900 dark:bg-gray-950 rounded-[24px] p-[6px] shadow-xl">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-gray-800"
      />
      {/* Phone frame inner */}
      <div className="bg-white dark:bg-gray-800 rounded-[20px] overflow-hidden flex flex-col min-h-[380px]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 pt-2 pb-1">
          <span className="text-[8px] text-gray-400 font-medium">9:41</span>
          <div className="w-16 h-4 bg-gray-900 dark:bg-gray-950 rounded-full" />
          <div className="flex items-center gap-0.5">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <rect x="1" y="10" width="4" height="12" rx="1" /><rect x="7" y="7" width="4" height="15" rx="1" /><rect x="13" y="4" width="4" height="18" rx="1" /><rect x="19" y="1" width="4" height="21" rx="1" />
            </svg>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
              <rect x="2" y="7" width="18" height="12" rx="2" /><rect x="20" y="10" width="2" height="6" rx="1" />
            </svg>
          </div>
        </div>

        {/* Screen title bar */}
        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
          <p className="text-[11px] font-bold text-gray-900 dark:text-white text-center truncate">
            {data.screenTitle}
          </p>
        </div>

        {/* Screen body */}
        <div className="flex-1 px-3 py-2 space-y-1.5 overflow-hidden">
          {data.description && (
            <p className="text-[8px] text-gray-400 dark:text-gray-500 text-center mb-1">
              {data.description}
            </p>
          )}
          {data.elements && data.elements.length > 0 && (
            <div className="space-y-1">
              {data.elements.map((el, i) => renderElement(el, i))}
            </div>
          )}
        </div>

        {/* Bottom home indicator */}
        <div className="flex justify-center pb-1.5 pt-1">
          <div className="w-20 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white dark:!border-gray-800"
      />
    </div>
  );
}

export const appFlowNodeTypes = {
  basicNode: BasicNode,
  wireframeNode: WireframeNode,
};
