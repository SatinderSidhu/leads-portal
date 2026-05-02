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

interface DocumentsSectionProps {
  leadId: string;
  isLoggedIn: boolean;
  customerUserId: string | null;
  returnTo: string;
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

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export default function DocumentsSection({
  leadId,
  isLoggedIn,
  customerUserId,
  returnTo,
}: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<LeadDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?leadId=${leadId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isLoggedIn) loadDocs();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, isLoggedIn]);

  function updateUpload(id: string, patch: Partial<UploadItem>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  async function uploadOne(item: UploadItem) {
    updateUpload(item.id, { status: "uploading", progress: 0 });
    try {
      const presignRes = await fetch("/api/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
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

      const recordRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
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

    // Upload up to 3 in parallel
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

    // Auto-clear successful uploads after 2.5s
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status !== "done"));
    }, 2500);
  }

  function dismissUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  async function handleDownload(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`);
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
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(error || "Delete failed");
      }
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Sign in to upload documents</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Create a free account or sign in to securely share documents with our team.</p>
        <div className="flex gap-2 justify-center">
          <a href={`/login?returnTo=${returnTo}`} className="px-5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Sign In</a>
          <a href={`/register?returnTo=${returnTo}`} className="px-5 py-2 rounded-xl bg-[#01358d] hover:bg-[#012d75] text-sm font-medium text-white transition">Create Account</a>
        </div>
      </div>
    );
  }

  const anyUploading = uploads.some((u) => u.status === "uploading" || u.status === "queued");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Documents</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Securely share documents with our team. Upload one or many at a time. PDF, Word, Excel, and images supported (max 25MB each).
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS}
          onChange={handleFilesSelected}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={anyUploading}
          className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-[#01358d] hover:bg-[#01358d]/5 dark:hover:bg-[#01358d]/10 transition-all text-center group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 group-hover:bg-[#01358d]/10 flex items-center justify-center transition-all">
            <svg className="w-6 h-6 text-gray-400 group-hover:text-[#01358d] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            {anyUploading ? "Uploading…" : "Click to upload (multiple files supported)"}
          </p>
          <p className="text-xs text-gray-400">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG · Max 25MB each</p>
        </button>

        {/* Upload queue */}
        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{u.file.name}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {u.status === "done" && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Done</span>
                    )}
                    {u.status === "error" && (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">Failed</span>
                    )}
                    {(u.status === "uploading" || u.status === "queued") && (
                      <span className="text-xs font-semibold text-[#01358d] dark:text-blue-400">{u.progress}%</span>
                    )}
                    {(u.status === "done" || u.status === "error") && (
                      <button
                        onClick={() => dismissUpload(u.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="Dismiss"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {u.status === "error" ? (
                  <p className="text-xs text-red-600 dark:text-red-400">{u.error}</p>
                ) : (
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        u.status === "done"
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-[#01358d] to-[#2870a8]"
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
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Documents list */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {documents.length === 0 ? "No documents yet" : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Documents you upload will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {documents.map((doc) => {
              const canDelete = doc.uploadedByType === "customer" && customerUserId !== null;
              const isMine = doc.uploadedByType === "customer";
              const canPreview = isPreviewable(doc.mimeType);
              return (
                <li key={doc.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <button
                    onClick={() => canPreview && setPreviewDoc(doc)}
                    disabled={!canPreview}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      doc.mimeType.startsWith("image/")
                        ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                        : "bg-blue-100 dark:bg-blue-900/40 text-[#01358d] dark:text-blue-400"
                    } ${canPreview ? "cursor-pointer hover:scale-105 transition" : "cursor-default"}`}
                    aria-label={canPreview ? "Preview" : undefined}
                  >
                    {fileIcon(doc.mimeType)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => canPreview ? setPreviewDoc(doc) : handleDownload(doc.id)}
                      className="text-sm font-semibold text-gray-900 dark:text-white truncate block text-left hover:text-[#01358d] dark:hover:text-blue-400 transition"
                    >
                      {doc.fileName}
                    </button>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>·</span>
                      <span>Uploaded by {isMine ? "you" : doc.uploadedBy} on {formatDate(doc.createdAt)}</span>
                      {!isMine && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[10px] font-semibold text-[#01358d] dark:text-blue-400">From KITLabs</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canPreview && (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#01358d] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                        title="Preview"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-[#01358d] hover:bg-blue-50 dark:hover:bg-blue-950/30 transition"
                      title="Download"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(doc.id, doc.fileName)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          fileName={previewDoc.fileName}
          mimeType={previewDoc.mimeType}
          previewEndpoint={`/api/documents/${previewDoc.id}`}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => handleDownload(previewDoc.id)}
        />
      )}
    </div>
  );
}
