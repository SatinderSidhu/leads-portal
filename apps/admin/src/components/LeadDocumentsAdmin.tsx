"use client";

import { useEffect, useRef, useState } from "react";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface LeadDocument {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByType: string;
  createdAt: string;
}

interface LeadDocumentsAdminProps {
  leadId: string;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg";
const MAX_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isPreviewable(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export default function LeadDocumentsAdmin({ leadId }: LeadDocumentsAdminProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LeadDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiBase = `/api/leads/${leadId}/documents`;

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch(apiBase, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  function updateUpload(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function uploadOne(item: UploadItem) {
    updateUpload(item.id, { status: "uploading", progress: 0 });
    try {
      const presignRes = await fetch(`${apiBase}/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: item.file.name,
          mimeType: item.file.type || "application/octet-stream",
          fileSize: item.file.size,
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
        xhr.setRequestHeader("Content-Type", item.file.type || "application/octet-stream");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            updateUpload(item.id, { progress: Math.round((ev.loaded / ev.total) * 100) });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`S3 upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("S3 upload failed"));
        xhr.send(item.file);
      });

      const recordRes = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: item.file.name,
          s3Key,
          fileSize: item.file.size,
          mimeType: item.file.type || "application/octet-stream",
        }),
      });
      if (!recordRes.ok) {
        const { error } = await recordRes.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(error || "Failed to save document");
      }

      updateUpload(item.id, { status: "done", progress: 100 });
    } catch (err) {
      updateUpload(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    const items: UploadItem[] = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        items.push({
          id: `${file.name}-${file.size}-${Math.random()}`,
          file,
          progress: 0,
          status: "error",
          error: "Too large (max 25MB)",
        });
        continue;
      }
      items.push({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        progress: 0,
        status: "queued",
      });
    }
    setUploads((prev) => [...prev, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const queue = [...items.filter((i) => i.status === "queued")];
    const workers = Array(Math.min(3, queue.length))
      .fill(0)
      .map(async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (next) await uploadOne(next);
        }
      });
    await Promise.all(workers);
    await loadDocs();

    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status !== "done"));
    }, 2500);
  }

  function dismissUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(`${apiBase}/${docId}`);
      if (!res.ok) throw new Error("Download failed");
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDelete(docId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${apiBase}/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(error || "Delete failed");
      }
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const anyUploading = uploads.some((u) => u.status === "uploading" || u.status === "queued");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
        <label className={`px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition cursor-pointer ${anyUploading ? "opacity-60 pointer-events-none" : ""}`}>
          {anyUploading ? "Uploading…" : "Upload Documents"}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS}
            onChange={handleFilesSelected}
            disabled={anyUploading}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Customer- and admin-shared documents (multi-file upload supported). PDF, DOC, DOCX, XLS, XLSX, PNG, JPG · max 25MB each. Stored in S3.
      </p>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="mb-4 space-y-2">
          {uploads.map((u) => (
            <div
              key={u.id}
              className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{u.file.name}</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.status === "done" && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Done</span>
                  )}
                  {u.status === "error" && (
                    <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">Failed</span>
                  )}
                  {(u.status === "uploading" || u.status === "queued") && (
                    <span className="text-[11px] font-semibold text-[#01358d] dark:text-blue-400">{u.progress}%</span>
                  )}
                  {(u.status === "done" || u.status === "error") && (
                    <button
                      onClick={() => dismissUpload(u.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Dismiss"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {u.status === "error" ? (
                <p className="text-[11px] text-red-600 dark:text-red-400">{u.error}</p>
              ) : (
                <div className="w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      u.status === "done" ? "bg-emerald-500" : "bg-[#01358d]"
                    }`}
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-400 text-sm">No documents yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const isCustomer = doc.uploadedByType === "customer";
            const canPreview = isPreviewable(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => canPreview ? setPreviewDoc(doc) : handleDownload(doc.id)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block text-left"
                  >
                    {doc.fileName}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <span>{formatBytes(doc.fileSize)}</span>
                    <span>·</span>
                    <span>{doc.uploadedBy}</span>
                    {isCustomer && (
                      <span className="px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-[10px] font-semibold text-[#f9556d]">
                        Customer
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  {canPreview && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium transition"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(doc.id)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium transition"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.fileName)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          docId={previewDoc.id}
          fileName={previewDoc.fileName}
          mimeType={previewDoc.mimeType}
          apiBase={apiBase}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => handleDownload(previewDoc.id)}
        />
      )}
    </div>
  );
}
