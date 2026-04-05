"use client";

import { useState, useRef } from "react";

interface NdaRequestModalProps {
  leadId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NdaRequestModal({ leadId, customerName, onClose, onSuccess }: NdaRequestModalProps) {
  const defaultMessage = `Dear KITLabs Team,\n\nI hope this message finds you well. I would like to request that we put a Non-Disclosure Agreement in place before we proceed further with the project. Having an NDA will give both parties the confidence to share project details and proprietary information freely.\n\nPlease share the NDA at your earliest convenience, or let me know if you need any information from my side to prepare it.\n\nThank you for your attention to this matter.\n\nBest regards,\n${customerName}`;

  const [message, setMessage] = useState(defaultMessage);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("leadId", leadId);
      formData.append("message", message.trim());
      if (file) formData.append("file", file);

      const res = await fetch("/api/nda/request", { method: "POST", body: formData });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send request");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".doc") && !ext.endsWith(".docx")) {
      setError("Only PDF and Word files are allowed.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError("");
    setFile(f);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Request NDA</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Send a request to the KITLabs team</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Your Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none leading-relaxed"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
              Attach Your Own NDA <span className="font-normal normal-case">(optional, PDF or Word)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="text-sm text-indigo-700 dark:text-indigo-300 truncate flex-1">{file.name}</span>
                <button
                  onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-indigo-400 hover:text-indigo-600 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 text-center hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition group"
              >
                <svg className="w-6 h-6 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 mx-auto mb-1 transition" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-xs text-gray-400 group-hover:text-indigo-500 transition">Click to upload PDF or Word file</p>
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#01358d] hover:bg-[#012a6e] rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
