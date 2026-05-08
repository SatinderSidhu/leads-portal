"use client";

import { useEffect, useState } from "react";

interface Props {
  project: {
    id: string;
    publicId: string;
    customerName: string | null;
    customerEmail: string | null;
    idea: string;
  };
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Two-gate confirmation: admin must (1) check the irreversibility box and
 * (2) type the customer name (or "DELETE" if no name) before the destructive
 * button enables. ESC and the backdrop only close the modal — they never
 * trigger the delete, so a fast misclick can't fire it.
 */
export default function AppFactoryDeleteModal({ project, onClose, onDeleted }: Props) {
  const expected = (project.customerName?.trim() || "DELETE").toLowerCase();
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const matches = typed.trim().toLowerCase() === expected;
  const canDelete = matches && acknowledged && !submitting;

  async function handleDelete() {
    if (!canDelete) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/app-factory/${project.id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(error || "Failed");
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            Delete project
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            This permanently removes <strong>{project.customerName || "this project"}</strong>
            {project.customerEmail && <> ({project.customerEmail})</>} from App Factory along with all of their flows, builds, app-store configs, and enhancement requests.
          </p>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 text-xs text-red-800 dark:text-red-300">
            <strong className="block mb-1">This action cannot be undone.</strong>
            The customer&apos;s public link <code className="font-mono">/c/{project.publicId}</code> stops working immediately.
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              I understand this is permanent and cannot be reversed.
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              To confirm, type{" "}
              <code className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
                {project.customerName?.trim() || "DELETE"}
              </code>
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                if (error) setError(null);
              }}
              disabled={submitting}
              placeholder={project.customerName?.trim() || "DELETE"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50"
              autoFocus
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}
