"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";
import type { Node, Edge } from "@xyflow/react";
import dynamic from "next/dynamic";

const FlowBuilder = dynamic(() => import("../../../components/FlowBuilder"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500 dark:text-gray-400">Loading flow builder...</p>
    </div>
  ),
});

interface EmailFlow {
  id: string;
  name: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EmailFlowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const [flow, setFlow] = useState<EmailFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable name/description
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);

  useEffect(() => {
    fetch(`/api/email-flows/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setFlow(data);
        setName(data.name);
        setDescription(data.description || "");
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/email-flows/${params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            nodes,
            edges,
          }),
        });
        if (!res.ok) {
          alert("Failed to save flow");
        }
      } catch {
        alert("Failed to save flow");
      } finally {
        setSaving(false);
      }
    },
    [params.id, name, description]
  );

  async function handleDelete() {
    if (!confirm(`Delete flow "${flow?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/email-flows/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/email-flows");
      } else {
        alert("Failed to delete");
      }
    } catch {
      alert("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Flow not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 shrink-0">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/email-flows")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Back
            </button>
            {editingInfo ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-2 py-1 text-lg font-bold border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
                <button
                  onClick={() => setEditingInfo(false)}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  Done
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditingInfo(true)}
                className="cursor-pointer"
                title="Click to edit"
              >
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {name}
                </h1>
                {description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition"
            >
              {deleting ? "Deleting..." : "Delete Flow"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1">
        <FlowBuilder
          initialNodes={flow.nodes || []}
          initialEdges={flow.edges || []}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}
