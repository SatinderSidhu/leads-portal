"use client";

import { useState, useRef } from "react";

interface Props {
  leadId: string;
  currentDescription: string;
}

export default function ProjectDescriptionEnhancer({
  leadId,
  currentDescription,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [enhancedDescription, setEnhancedDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleGenerate() {
    if (!notes.trim()) return;
    setError("");
    setEnhancedDescription("");
    setGenerating(true);
    setSaved(false);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/project-description/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, additionalNotes: notes }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate");
        setGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
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
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const text = JSON.parse(data);
            if (typeof text === "string" && !text.startsWith("[ERROR]")) {
              accumulated += text;
              setEnhancedDescription(accumulated);
            } else if (
              typeof text === "string" &&
              text.startsWith("[ERROR]")
            ) {
              setError(text);
            }
          } catch {
            // skip invalid JSON chunks
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  async function handleSave() {
    if (!enhancedDescription.trim()) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/project-description/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          description: enhancedDescription,
        }),
      });

      if (res.ok) {
        setSaved(true);
        // Reload after a short delay so the server-rendered page shows the new description
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (abortRef.current) abortRef.current.abort();
    setIsExpanded(false);
    setNotes("");
    setEnhancedDescription("");
    setError("");
    setGenerating(false);
    setSaved(false);
  }

  if (!isExpanded) {
    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
          Does this description fully capture your project idea? Would you like
          to add more details so we can understand it better?
        </p>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-sm font-medium text-white bg-[#01358d] hover:bg-[#012a6e] px-4 py-2 rounded-lg transition dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Enhance Project Description with AI
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
          Tell us more about your project — what features do you envision, what
          problems should it solve, who are the users?
        </p>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          title="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. I also want users to be able to book appointments, there should be a dashboard showing analytics, the app needs to work on both iOS and Android..."
        rows={4}
        disabled={generating}
        className="w-full px-4 py-3 border border-blue-200 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white dark:bg-gray-800 text-sm resize-none disabled:opacity-50"
      />

      {!enhancedDescription && (
        <button
          onClick={handleGenerate}
          disabled={generating || !notes.trim()}
          className="text-sm font-medium text-white bg-[#01358d] hover:bg-[#012a6e] px-5 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {generating ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Enhancing...
            </>
          ) : (
            "Enhance with AI"
          )}
        </button>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {enhancedDescription && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Enhanced Description
          </p>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
            {enhancedDescription}
          </div>

          {!saved ? (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-lg transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save as Project Description"}
              </button>
              <button
                onClick={() => {
                  setEnhancedDescription("");
                  setError("");
                }}
                disabled={saving}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2.5 transition"
              >
                Try Again
              </button>
            </div>
          ) : (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Description updated successfully! Refreshing...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
