"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { downloadSowPdf } from "../lib/generate-pdf";

interface SowComment {
  id: string;
  content: string;
  authorName: string;
  authorType: string;
  createdAt: string;
}

interface SowItem {
  id: string;
  version: number;
  fileName: string | null;
  filePath: string | null;
  fileSize: number | null;
  fileType: string | null;
  content: string | null;
  comments: string | null;
  sharedAt: string | null;
  createdAt: string;
  signedAt: string | null;
  signerName: string | null;
  sowComments: SowComment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SowSection({
  leadId,
  projectName,
  sows,
  initialVersion,
  isLoggedIn = false,
  returnTo,
}: {
  leadId: string;
  projectName: string;
  sows: SowItem[];
  initialVersion?: number;
  isLoggedIn?: boolean;
  returnTo?: string;
}) {
  const [selectedVersion, setSelectedVersion] = useState<number>(
    initialVersion || (sows.length > 0 ? sows[0].version : 0)
  );
  const [fullScreen, setFullScreen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sowComments, setSowComments] = useState<Record<string, SowComment[]>>(
    () => {
      const map: Record<string, SowComment[]> = {};
      for (const s of sows) {
        map[s.id] = s.sowComments || [];
      }
      return map;
    }
  );

  // Signing state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signedData, setSignedData] = useState<Record<string, { signedAt: string; signerName: string }>>(
    () => {
      const map: Record<string, { signedAt: string; signerName: string }> = {};
      for (const s of sows) {
        if (s.signedAt && s.signerName) {
          map[s.id] = { signedAt: s.signedAt, signerName: s.signerName };
        }
      }
      return map;
    }
  );

  const selectedSow = sows.find((s) => s.version === selectedVersion) || sows[0];
  const isAiGenerated = selectedSow?.content && !selectedSow?.filePath;
  const currentComments = selectedSow ? (sowComments[selectedSow.id] || []) : [];
  const currentSigned = selectedSow ? signedData[selectedSow.id] : null;

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !selectedSow) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sow/${selectedSow.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setSowComments((prev) => ({
          ...prev,
          [selectedSow.id]: [...(prev[selectedSow.id] || []), comment],
        }));
        setCommentText("");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [commentText, selectedSow]);

  const handleSign = useCallback(async () => {
    if (!signerName.trim() || !selectedSow) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/sow/${selectedSow.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: signerName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSignedData((prev) => ({
          ...prev,
          [selectedSow.id]: data,
        }));
        setShowSignModal(false);
        setSignerName("");
      }
    } catch {
      // silently fail
    } finally {
      setSigning(false);
    }
  }, [signerName, selectedSow]);

  const handleDownloadPdf = useCallback(() => {
    if (!selectedSow?.content) return;
    downloadSowPdf(selectedSow.content, projectName, selectedSow.version);
  }, [selectedSow, projectName]);

  if (sows.length === 0) {
    return <p className="text-gray-500">No scope of work documents available yet.</p>;
  }

  // Full-screen overlay (portal to body to escape backdrop-filter stacking context)
  const fullScreenOverlay = fullScreen && selectedSow ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Scope of Work — v{selectedSow.version}
          </h3>
          {isAiGenerated && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              AI Generated
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAiGenerated && (
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] transition"
            >
              Download PDF
            </button>
          )}
          <button
            onClick={() => setFullScreen(false)}
            className="px-4 py-2 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Exit Full Screen
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
        {isAiGenerated ? (
          <SowHtmlPreview content={selectedSow.content!} version={selectedSow.version} fullScreen />
        ) : selectedSow.fileType === "application/pdf" && selectedSow.filePath ? (
          <iframe
            src={selectedSow.filePath}
            className="w-full h-full"
            title={`SOW v${selectedSow.version}`}
          />
        ) : null}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
    {fullScreenOverlay}
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">Scope of Work</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{projectName}</h3>
      </div>

      {/* Version Selector */}
      {sows.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Version</label>
          <div className="flex gap-2 flex-wrap">
            {sows.map((sow) => (
              <button
                key={sow.id}
                onClick={() => setSelectedVersion(sow.version)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedVersion === sow.version
                    ? "bg-[#01358d] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                v{sow.version}
                {sow.version === sows[0].version && " (Latest)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSow && (
        <div>
          {/* Document Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Version {selectedSow.version}
                  </p>
                  {isAiGenerated && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      AI Generated
                    </span>
                  )}
                  {currentSigned && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Approved
                    </span>
                  )}
                </div>
                {selectedSow.fileName && (
                  <p className="text-sm text-gray-600 mt-0.5">{selectedSow.fileName}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {selectedSow.fileSize ? `${formatFileSize(selectedSow.fileSize)} · ` : ""}
                  Shared on{" "}
                  {selectedSow.sharedAt
                    ? new Date(selectedSow.sharedAt).toLocaleDateString()
                    : new Date(selectedSow.createdAt).toLocaleDateString()}
                </p>
                {selectedSow.comments && (
                  <p className="text-sm text-gray-600 mt-3 italic border-l-2 border-[#01358d]/30 pl-3">
                    {selectedSow.comments}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isAiGenerated && (
                  <button
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
                  >
                    Download PDF
                  </button>
                )}
                {selectedSow.filePath && (
                  <a
                    href={selectedSow.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-[#01358d] text-white rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
                  >
                    Download
                  </a>
                )}
                {(isAiGenerated || (selectedSow.fileType === "application/pdf" && selectedSow.filePath)) && (
                  <button
                    onClick={() => setFullScreen(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                  >
                    Full Screen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Signed badge */}
          {currentSigned && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800">
                  Approved and signed by {currentSigned.signerName} on{" "}
                  {new Date(currentSigned.signedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* AI-generated HTML content */}
          {isAiGenerated && (
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Document Preview
              </p>
              <SowHtmlPreview content={selectedSow.content!} version={selectedSow.version} />
            </div>
          )}

          {/* PDF Preview (file-based) */}
          {!isAiGenerated && selectedSow.fileType === "application/pdf" && selectedSow.filePath && (
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                Document Preview
              </p>
              <div className="border border-gray-200 rounded-xl overflow-hidden" style={{ height: "600px" }}>
                <iframe
                  src={selectedSow.filePath}
                  className="w-full h-full"
                  title={`SOW v${selectedSow.version}`}
                />
              </div>
            </div>
          )}

          {/* Word document - can't preview inline */}
          {!isAiGenerated && selectedSow.fileType !== "application/pdf" && selectedSow.filePath && (
            <div className="bg-[#01358d]/5 border border-[#01358d]/20 rounded-xl p-6 text-center">
              <p className="text-[#01358d] font-medium mb-2">
                This document is a Word file (.{selectedSow.fileName?.split(".").pop()})
              </p>
              <p className="text-[#01358d]/70 text-sm mb-4">
                Please download it to view the full scope of work.
              </p>
              <a
                href={selectedSow.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-[#01358d] text-white rounded-lg font-medium hover:bg-[#012a70] transition"
              >
                Download Document
              </a>
            </div>
          )}

          {/* Approve & Sign Section */}
          {!currentSigned && isLoggedIn && (
            <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 dark:bg-amber-900/20 dark:border-amber-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Approve Scope of Work</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  After reviewing the scope of work, you can approve it by providing your digital signature below.
                  This confirms that you agree with the outlined deliverables, timeline, and milestones.
                </p>
                <button
                  onClick={() => setShowSignModal(true)}
                  className="px-6 py-3 bg-[#f9556d] text-white rounded-lg font-medium hover:bg-[#e8445c] transition"
                >
                  Approve &amp; Sign
                </button>
              </div>
            </div>
          )}
          {!currentSigned && !isLoggedIn && (
            <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 dark:bg-gray-800 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <a href={`/login${returnTo ? `?returnTo=${returnTo}` : ""}`} className="text-[#01358d] dark:text-blue-400 font-medium hover:underline">Sign in</a> to approve and sign the scope of work.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version History */}
      {sows.length > 1 && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Version History</p>
          <div className="space-y-3">
            {sows.map((sow) => (
              <div
                key={sow.id}
                className={`p-4 rounded-lg border cursor-pointer transition ${
                  selectedVersion === sow.version
                    ? "border-[#01358d]/30 bg-[#01358d]/5"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
                onClick={() => setSelectedVersion(sow.version)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">Version {sow.version}</p>
                    {sow.content && !sow.filePath && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        AI
                      </span>
                    )}
                    {signedData[sow.id] && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Approved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {sow.sharedAt ? new Date(sow.sharedAt).toLocaleDateString() : ""}
                  </p>
                </div>
                {sow.comments && (
                  <p className="text-xs text-gray-500 mt-0.5">{sow.comments}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-6">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Comments ({currentComments.length})
        </p>

        {currentComments.length > 0 && (
          <div className="space-y-3 mb-6">
            {currentComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg p-4 border ${
                  comment.authorType === "customer"
                    ? "bg-[#01358d]/5 border-[#01358d]/10 dark:bg-blue-900/20 dark:border-blue-800/30"
                    : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.authorName}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      comment.authorType === "customer"
                        ? "bg-[#01358d]/10 text-[#01358d] dark:bg-blue-500/20 dark:text-blue-300"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {comment.authorType === "customer" ? "You" : "Team"}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add comment form */}
        {isLoggedIn ? (
          <>
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave a comment or feedback on the scope of work..."
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none resize-none focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                className="px-4 py-2 text-sm font-medium bg-[#01358d] text-white rounded-lg hover:bg-[#012a70] disabled:opacity-50 transition self-end"
              >
                {submitting ? "Sending..." : "Comment"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Press Cmd+Enter to submit</p>
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <a href={`/login${returnTo ? `?returnTo=${returnTo}` : ""}`} className="text-[#01358d] dark:text-blue-400 font-medium hover:underline">Sign in</a> to leave comments or approve the scope of work.
          </p>
        )}
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Approve &amp; Sign SOW</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              By signing, you confirm that you have reviewed and agree to the Scope of Work
              (Version {selectedSow?.version}) for {projectName}.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Full Name (Digital Signature)
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full legal name"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none text-gray-900 dark:text-white dark:bg-gray-800"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && signerName.trim()) handleSign();
                }}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6 text-xs text-gray-500 dark:text-gray-400">
              By clicking &quot;Sign &amp; Approve&quot; you agree to electronically sign this document.
              Your name, IP address, and timestamp will be recorded.
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowSignModal(false); setSignerName(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={!signerName.trim() || signing}
                className="px-6 py-2 text-sm font-medium bg-[#f9556d] text-white rounded-lg hover:bg-[#e8445c] disabled:opacity-50 transition"
              >
                {signing ? "Signing..." : "Sign & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

/** Renders AI-generated HTML content in an auto-resizing iframe */
function SowHtmlPreview({
  content,
  version,
  fullScreen,
}: {
  content: string;
  version: number;
  fullScreen?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.7;
      color: #1a1a1a;
      padding: 40px;
      margin: 0;
      max-width: 800px;
    }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #111; }
    h2 { font-size: 20px; font-weight: 600; margin: 32px 0 12px; color: #222; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; color: #333; }
    p { margin: 8px 0; }
    ul, ol { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    strong { font-weight: 600; }
  </style>
</head>
<body>${content}</body>
</html>`;

    iframe.srcdoc = html;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        setHeight(doc.body.scrollHeight + 80);
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [content, fullScreen]);

  if (fullScreen) {
    return (
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        style={{ border: "none" }}
        title={`SOW v${version}`}
        sandbox="allow-same-origin"
      />
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        className="w-full"
        style={{ height: `${height}px`, border: "none" }}
        title={`SOW v${version}`}
        sandbox="allow-same-origin"
      />
    </div>
  );
}
