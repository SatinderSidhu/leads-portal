"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReqType = "EPIC" | "FEATURE" | "USER_STORY";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface Requirement {
  id: string;
  leadId: string;
  parentId: string | null;
  type: ReqType;
  title: string;
  description: string | null;
  priority: Priority;
  sortOrder: number;
  createdBy: string | null;
  createdByType: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  leadId: string;
  isLoggedIn: boolean;
  returnTo: string;
}

const TYPE_LABELS: Record<ReqType, string> = {
  EPIC: "Epic",
  FEATURE: "Feature",
  USER_STORY: "User Story",
};

const TYPE_ICONS: Record<ReqType, string> = {
  EPIC: "🎯",
  FEATURE: "✨",
  USER_STORY: "📝",
};

const TYPE_RING: Record<ReqType, string> = {
  EPIC: "ring-purple-200 dark:ring-purple-900",
  FEATURE: "ring-blue-200 dark:ring-blue-900",
  USER_STORY: "ring-emerald-200 dark:ring-emerald-900",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export default function RequirementsSection({ leadId, isLoggedIn, returnTo }: Props) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addContext, setAddContext] = useState<{ type: ReqType; parentId: string | null } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements?leadId=${leadId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        // Auto-expand all epics on first load so the customer sees structure.
        if (Array.isArray(data) && expanded.size === 0) {
          const newSet = new Set<string>();
          for (const r of data as Requirement[]) {
            if (r.type === "EPIC" || r.type === "FEATURE") newSet.add(r.id);
          }
          setExpanded(newSet);
        }
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, isLoggedIn]);

  useEffect(() => { load(); }, [load]);

  // Build the tree once per items change.
  const tree = useMemo(() => buildTree(items), [items]);
  // Top level shows ANY item without a parent — Epics plus orphan Features
  // and User Stories that the customer added quickly without thinking about
  // structure. The tree builder already promotes parentless items to roots.
  const topLevel = tree;
  const epics = tree.filter((r) => r.type === "EPIC");
  const features = useMemo(() => {
    // Features visible as parent options for the quick-add include both
    // nested-under-an-epic and orphan Features.
    const out: TreeNode[] = [];
    function walk(nodes: TreeNode[]) {
      for (const n of nodes) {
        if (n.type === "FEATURE") out.push(n);
        if (n.children.length) walk(n.children);
      }
    }
    walk(tree);
    return out;
  }, [tree]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(input: {
    type: ReqType;
    parentId: string | null;
    title: string;
    description: string;
    priority: Priority;
  }) {
    setError(null);
    const res = await fetch("/api/requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, ...input }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error || "Failed");
      return false;
    }
    setAddContext(null);
    await load();
    return true;
  }

  async function handleUpdate(id: string, patch: { title?: string; description?: string; priority?: Priority }) {
    setError(null);
    const res = await fetch(`/api/requirements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      setError(error || "Failed");
      return false;
    }
    await load();
    return true;
  }

  async function handleDelete(item: Requirement) {
    const kids = items.filter((i) => i.parentId === item.id).length;
    const msg = kids
      ? `Delete "${item.title}" and its ${kids} child item${kids === 1 ? "" : "s"}? This can't be undone.`
      : `Delete "${item.title}"? This can't be undone.`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/requirements/${item.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function handleReorder(reordered: Requirement[]) {
    // Optimistic — set the state immediately, then push to server.
    setItems((prev) => {
      const map = new Map(reordered.map((r) => [r.id, r.sortOrder] as const));
      return prev.map((r) => (map.has(r.id) ? { ...r, sortOrder: map.get(r.id)! } : r));
    });
    await fetch("/api/requirements/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        items: reordered.map((r) => ({ id: r.id, sortOrder: r.sortOrder })),
      }),
    });
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        title="Sign in to manage requirements"
        body="Add epics, features, and user stories to scope your project. Sign in to get started."
        cta={{ label: "Sign In", href: `/login?returnTo=${returnTo}` }}
      />
    );
  }
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Requirements</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Just type what you need below. Add as many as you want — we&apos;ll help organize them with you later.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Quick-add bar — always visible, encourages non-technical customers
          to just dump ideas without thinking about epic/feature hierarchy. */}
      <QuickAdd
        onSubmit={async (input) =>
          handleCreate({
            type: input.type,
            parentId: null,
            title: input.title,
            description: "",
            priority: "MEDIUM",
          })
        }
        onOpenAdvanced={() => setAddContext({ type: "USER_STORY", parentId: null })}
      />

      {addContext && (
        <AddForm
          context={addContext}
          epics={epics}
          features={features}
          onCancel={() => setAddContext(null)}
          onSubmit={handleCreate}
        />
      )}

      {topLevel.length === 0 && !addContext ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 text-center mt-4">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Your requirements will appear here as you add them.
          </p>
        </div>
      ) : (
        <SiblingList
          siblings={topLevel}
          allItems={items}
          expanded={expanded}
          onToggle={toggle}
          onReorder={handleReorder}
          onAdd={(parentId, type) => setAddContext({ type, parentId })}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      )}
    </div>
  );
}

/* ─── Tree helpers ─── */

interface TreeNode extends Requirement {
  children: TreeNode[];
}

function buildTree(items: Requirement[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const r of items) map.set(r.id, { ...r, children: [] });
  const roots: TreeNode[] = [];
  for (const r of items) {
    const node = map.get(r.id)!;
    if (r.parentId && map.has(r.parentId)) {
      map.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Each level sorts by sortOrder.
  function sort(nodes: TreeNode[]) {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const n of nodes) sort(n.children);
  }
  sort(roots);
  return roots;
}

/* ─── Sibling list with HTML5 drag-to-reorder ─── */

function SiblingList({
  siblings,
  allItems,
  expanded,
  onToggle,
  onReorder,
  onAdd,
  onUpdate,
  onDelete,
  editingId,
  setEditingId,
  depth = 0,
}: {
  siblings: TreeNode[];
  allItems: Requirement[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onReorder: (items: Requirement[]) => void;
  onAdd: (parentId: string | null, type: ReqType) => void;
  onUpdate: (id: string, patch: { title?: string; description?: string; priority?: Priority }) => Promise<boolean>;
  onDelete: (item: Requirement) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  depth?: number;
}) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDrop(targetId: string, draggedId: string) {
    setDragOverId(null);
    if (draggedId === targetId) return;
    const draggedIdx = siblings.findIndex((s) => s.id === draggedId);
    const targetIdx = siblings.findIndex((s) => s.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const next = siblings.slice();
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, moved);
    // Reassign sortOrder so server agrees with the new positions.
    const reordered = next.map((r, i) => ({ ...r, sortOrder: i }));
    onReorder(reordered);
  }

  return (
    <div className={depth === 0 ? "space-y-3" : "space-y-2 mt-2 ml-6 border-l-2 border-gray-100 dark:border-gray-800 pl-4"}>
      {siblings.map((node) => (
        <Row
          key={node.id}
          node={node}
          allItems={allItems}
          expanded={expanded}
          onToggle={onToggle}
          onReorder={onReorder}
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
          editingId={editingId}
          setEditingId={setEditingId}
          isDragOver={dragOverId === node.id}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", node.id)}
          onDragOver={(e) => {
            e.preventDefault();
            // Only allow drop on a sibling of the same type / same parent.
            const draggedId = e.dataTransfer.getData("text/plain");
            if (draggedId && siblings.some((s) => s.id === draggedId)) {
              setDragOverId(node.id);
            }
          }}
          onDragLeave={() => setDragOverId((cur) => (cur === node.id ? null : cur))}
          onDrop={(e) => {
            const draggedId = e.dataTransfer.getData("text/plain");
            if (draggedId) handleDrop(node.id, draggedId);
          }}
          depth={depth}
        />
      ))}
    </div>
  );
}

/* ─── Row (one requirement, with optional inline edit form + children) ─── */

function Row({
  node,
  allItems,
  expanded,
  onToggle,
  onReorder,
  onAdd,
  onUpdate,
  onDelete,
  editingId,
  setEditingId,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  depth,
}: {
  node: TreeNode;
  allItems: Requirement[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onReorder: (items: Requirement[]) => void;
  onAdd: (parentId: string | null, type: ReqType) => void;
  onUpdate: (id: string, patch: { title?: string; description?: string; priority?: Priority }) => Promise<boolean>;
  onDelete: (item: Requirement) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  depth: number;
}) {
  const isOpen = expanded.has(node.id);
  const isEditing = editingId === node.id;
  const canHaveChildren = node.type === "EPIC" || node.type === "FEATURE";
  const childAddType: ReqType | null = node.type === "EPIC" ? "FEATURE" : node.type === "FEATURE" ? "USER_STORY" : null;

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border ${
        isDragOver
          ? "border-[#01358d] ring-2 ring-[#01358d]/30"
          : "border-gray-200 dark:border-gray-700"
      } shadow-sm transition-all ring-1 ${TYPE_RING[node.type]}`}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        {/* Drag handle */}
        <div className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing select-none pt-1" title="Drag to reorder">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <circle cx="6" cy="5" r="1.4" /><circle cx="10" cy="5" r="1.4" /><circle cx="14" cy="5" r="1.4" />
            <circle cx="6" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="14" cy="10" r="1.4" />
            <circle cx="6" cy="15" r="1.4" /><circle cx="10" cy="15" r="1.4" /><circle cx="14" cy="15" r="1.4" />
          </svg>
        </div>

        {/* Expand toggle */}
        {canHaveChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Main */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <EditForm
              node={node}
              onCancel={() => setEditingId(null)}
              onSubmit={async (patch) => {
                const ok = await onUpdate(node.id, patch);
                if (ok) setEditingId(null);
              }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base" aria-hidden>{TYPE_ICONS[node.type]}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {TYPE_LABELS[node.type]}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[node.priority]}`}>
                  {PRIORITY_LABELS[node.priority]}
                </span>
                {node.createdByType === "admin" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                    From KITLabs
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{node.title}</p>
              {node.description && (
                <div
                  className="text-sm text-gray-600 dark:text-gray-400 mt-1 prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: node.description }}
                />
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {canHaveChildren && childAddType && (
              <button
                onClick={() => onAdd(node.id, childAddType)}
                className="text-[11px] text-[#01358d] dark:text-blue-400 hover:underline font-semibold px-2 py-1"
                title={`Add ${TYPE_LABELS[childAddType]}`}
              >
                + {TYPE_LABELS[childAddType]}
              </button>
            )}
            <button
              onClick={() => setEditingId(node.id)}
              className="p-1.5 rounded text-gray-400 hover:text-[#01358d] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(node)}
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isOpen && node.children.length > 0 && (
        <div className="px-4 pb-4">
          <SiblingList
            siblings={node.children}
            allItems={allItems}
            expanded={expanded}
            onToggle={onToggle}
            onReorder={onReorder}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onDelete={onDelete}
            editingId={editingId}
            setEditingId={setEditingId}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Add form (modal-like inline panel) ─── */

/* ─── Quick-add bar (the inviting empty-state textbox) ─── */

function QuickAdd({
  onSubmit,
  onOpenAdvanced,
}: {
  onSubmit: (input: { type: ReqType; title: string }) => Promise<boolean>;
  onOpenAdvanced: () => void;
}) {
  const [type, setType] = useState<ReqType>("USER_STORY");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit({ type, title: t });
    setSubmitting(false);
    if (ok) {
      setTitle("");
      // Keep the selected type so the customer can rattle off a few of the
      // same kind without re-picking.
    }
  }

  return (
    <div className="mb-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-3 flex flex-col sm:flex-row items-stretch gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ReqType)}
        disabled={submitting}
        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#01358d] disabled:opacity-50 flex-shrink-0"
      >
        <option value="USER_STORY">📝 User Story</option>
        <option value="EPIC">🎯 Epic</option>
        <option value="FEATURE">✨ Feature</option>
      </select>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={submitting}
        placeholder="Add your requirement…"
        className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] disabled:opacity-50"
      />
      <button
        onClick={submit}
        disabled={!title.trim() || submitting}
        className="px-4 py-2 bg-[#01358d] hover:bg-[#012a70] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {submitting ? "Adding…" : "Add"}
      </button>
      <button
        onClick={onOpenAdvanced}
        disabled={submitting}
        className="px-3 py-2 text-xs text-gray-500 hover:text-[#01358d] dark:text-gray-400 dark:hover:text-blue-400 transition whitespace-nowrap"
        title="Add description, priority, parent"
      >
        More options
      </button>
    </div>
  );
}

function AddForm({
  context,
  epics,
  features,
  onCancel,
  onSubmit,
}: {
  context: { type: ReqType; parentId: string | null };
  epics: TreeNode[];
  features: TreeNode[];
  onCancel: () => void;
  onSubmit: (input: { type: ReqType; parentId: string | null; title: string; description: string; priority: Priority }) => Promise<boolean>;
}) {
  const [type, setType] = useState<ReqType>(context.type);
  const [parentId, setParentId] = useState<string | null>(context.parentId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // When user changes type, reset parent to "no parent" so the form
    // doesn't pre-pick something they didn't intend.
    setParentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Parent is optional for Feature + User Story now. The form just offers
  // it as a "place under" choice rather than a hard requirement.
  const canHaveParent = type !== "EPIC";
  const parentOptions = type === "FEATURE" ? epics : type === "USER_STORY" ? features : [];

  async function submit() {
    if (!title.trim()) return;
    setSubmitting(true);
    const ok = await onSubmit({ type, parentId, title: title.trim(), description, priority });
    setSubmitting(false);
    if (ok) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <div className="mb-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">New work item</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReqType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          >
            <option value="EPIC">🎯 Epic</option>
            <option value="FEATURE">✨ Feature</option>
            <option value="USER_STORY">📝 User Story</option>
          </select>
        </div>
        {canHaveParent && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Place under <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
            >
              <option value="">— No parent —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {type === "FEATURE" ? `Epic: ${p.title}` : `Feature: ${p.title}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`e.g. ${type === "EPIC" ? "User onboarding" : type === "FEATURE" ? "Email + password sign-up" : "Customer can reset their password"}`}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          autoFocus
        />
      </div>
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description <span className="text-gray-400 font-normal">(HTML or plain text — optional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What does this need to do, who is it for, what does success look like?"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] resize-y"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={submitting} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">Cancel</button>
        <button
          onClick={submit}
          disabled={submitting || !title.trim()}
          className="px-4 py-2 bg-[#01358d] hover:bg-[#012a70] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

/* ─── Edit form (inline, replaces row content) ─── */

function EditForm({
  node,
  onCancel,
  onSubmit,
}: {
  node: Requirement;
  onCancel: () => void;
  onSubmit: (patch: { title: string; description: string; priority: Priority }) => Promise<void>;
}) {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description || "");
  const [priority, setPriority] = useState<Priority>(node.priority);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          autoFocus
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Description (HTML or plain text)"
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d] resize-y"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={submitting} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1">Cancel</button>
        <button
          onClick={async () => {
            if (!title.trim()) return;
            setSubmitting(true);
            await onSubmit({ title: title.trim(), description, priority });
            setSubmitting(false);
          }}
          disabled={submitting || !title.trim()}
          className="text-xs px-3 py-1.5 bg-[#01358d] hover:bg-[#012a70] text-white rounded-md font-semibold disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: string } }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{body}</p>
      {cta && (
        <a href={cta.href} className="inline-flex px-5 py-2 rounded-xl bg-[#01358d] hover:bg-[#012d75] text-sm font-medium text-white transition">
          {cta.label}
        </a>
      )}
    </div>
  );
}
