"use client";

import { useEffect, useRef, useState } from "react";

interface NdaUploadModalProps {
  leadId: string;
  defaultSignerName?: string;
  isReplace: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx";
const MAX_SIZE = 25 * 1024 * 1024;

export default function NdaUploadModal({
  leadId,
  defaultSignerName = "",
  isReplace,
  onClose,
  onUploaded,
}: NdaUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signedAt, setSignedAt] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, uploading]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setError("File too large (max 25MB).");
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(f);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (!signerName.trim()) {
      setError("Enter the signer's name.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const presignRes = await fetch(`/api/leads/${leadId}/nda/upload-presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({ error: "Upload setup failed" }));
        throw new Error(error || "Upload setup failed");
      }
      const { uploadUrl, s3Key } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("S3 upload failed"));
        xhr.send(file);
      });

      const recordRes = await fetch(`/api/leads/${leadId}/nda/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          s3Key,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          signerName: signerName.trim(),
          signedAt: new Date(signedAt).toISOString(),
        }),
      });
      if (!recordRes.ok) {
        const { error } = await recordRes.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(error || "Failed to save NDA");
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isReplace ? "Replace Signed NDA" : "Upload Signed NDA"}
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            For NDAs that were signed outside this system. The customer will be able to preview and download the file.
          </p>

          {/* File picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              File (PDF or Word)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS}
              onChange={handleFileSelected}
              disabled={uploading}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:border-[#01358d] hover:bg-[#01358d]/5 transition disabled:opacity-50 text-left"
            >
              {file ? (
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">Click to choose a file (max 25MB)</span>
              )}
            </button>
          </div>

          {/* Signer Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Signed By
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={uploading}
              placeholder="Full legal name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition"
            />
          </div>

          {/* Signed Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Date Signed
            </label>
            <input
              type="date"
              value={signedAt}
              onChange={(e) => setSignedAt(e.target.value)}
              disabled={uploading}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition"
            />
          </div>

          {uploading && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Uploading…</span>
                <span className="text-xs font-semibold text-[#01358d] dark:text-blue-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#01358d] transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t dark:border-gray-700 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !file || !signerName.trim()}
            className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? "Uploading…" : isReplace ? "Replace" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
