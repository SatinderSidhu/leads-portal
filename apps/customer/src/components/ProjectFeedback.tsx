"use client";

import { useState, useCallback } from "react";

interface NoteData {
  id: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface Props {
  leadId: string;
  initialNotes: NoteData[];
  isLoggedIn: boolean;
  returnTo: string;
}

export default function ProjectFeedback({ leadId, initialNotes, isLoggedIn, returnTo }: Props) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, content: commentText.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [...prev, note]);
        setCommentText("");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [commentText, leadId]);

  const isCustomerComment = (createdBy: string | null) =>
    createdBy?.endsWith("(Customer)");

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Comments</p>

      {/* Comments list */}
      {notes.length > 0 && (
        <div className="space-y-3 mb-6">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-lg p-4 border ${
                isCustomerComment(note.createdBy)
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ml-8"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 mr-8"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${
                  isCustomerComment(note.createdBy)
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {isCustomerComment(note.createdBy) ? "You" : (note.createdBy || "Team")}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isCustomerComment(note.createdBy)
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}>
                  {isCustomerComment(note.createdBy) ? "You" : "Team"}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      {isLoggedIn ? (
        <div className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your feedback or ask a question about the project..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white dark:bg-gray-800 text-sm resize-none"
          />
          <button
            onClick={handleAddComment}
            disabled={!commentText.trim() || submitting}
            className="text-sm font-medium text-white bg-[#01358d] hover:bg-[#012a6e] px-5 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {submitting ? "Sending..." : "Send Comment"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <a href={`/login${returnTo ? `?returnTo=${returnTo}` : ""}`} className="text-[#01358d] dark:text-blue-400 font-medium hover:underline">Sign in</a> to leave comments or feedback.
        </p>
      )}
    </div>
  );
}
