"use client";

import { useEffect, useRef, useState } from "react";

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

export default function LeadDocumentsAdmin({ leadId }: LeadDocumentsAdminProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/documents`, { cache: "no-store" });
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

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_SIZE) {
      setError("File too large (max 25MB).");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const presignRes = await fetch(`/api/leads/${leadId}/documents/presign`, {
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

      const recordRes = await fetch(`/api/leads/${leadId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          s3Key,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      if (!recordRes.ok) {
        const { error } = await recordRes.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(error || "Failed to save document");
      }

      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`);
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
      const res = await fetch(`/api/leads/${leadId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(error || "Delete failed");
      }
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
        <label className="px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition cursor-pointer">
          {uploading ? `Uploading… ${progress}%` : "Upload Document"}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            onChange={handleFileSelected}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Customer-shared and admin-shared documents. PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 25MB). Stored in S3.
      </p>

      {uploading && (
        <div className="mb-4 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-[#01358d] transition-all duration-150" style={{ width: `${progress}%` }} />
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
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600"
              >
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleDownload(doc.id)}
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
    </div>
  );
}
