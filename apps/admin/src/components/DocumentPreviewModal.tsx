"use client";

import { useEffect, useState } from "react";

interface DocumentPreviewModalProps {
  docId: string;
  fileName: string;
  mimeType: string;
  apiBase: string; // e.g. "/api/leads/{id}/documents"
  onClose: () => void;
  onDownload: () => void;
}

function isPreviewable(mimeType: string): "pdf" | "image" | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return null;
}

export default function DocumentPreviewModal({
  docId,
  fileName,
  mimeType,
  apiBase,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewType = isPreviewable(mimeType);

  useEffect(() => {
    if (!previewType) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/${docId}?inline=1`);
        if (!res.ok) throw new Error("Failed to load preview");
        const { downloadUrl } = await res.json();
        if (!cancelled) setUrl(downloadUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Preview failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docId, apiBase, previewType]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-5 h-5 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="text-white font-medium truncate">{fileName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onDownload}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Download
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
        {!previewType ? (
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h6m-6 4.5h6m1.5-12V21a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 6 1.5h6.379a1.5 1.5 0 0 1 1.06.44l3.122 3.12a1.5 1.5 0 0 1 .44 1.06Z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Preview not available</h3>
            <p className="text-white/70 text-sm mb-5">
              Word and Excel documents can&apos;t be previewed in the browser. Download the file to view it.
            </p>
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 font-medium text-sm hover:bg-white/90 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Download
            </button>
          </div>
        ) : error ? (
          <div className="text-white/80 text-sm">{error}</div>
        ) : !url ? (
          <div className="text-white/60 text-sm">Loading preview…</div>
        ) : previewType === "pdf" ? (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-full bg-white rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
