"use client";

import { useState } from "react";

interface SowItem {
  id: string;
  version: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  comments: string | null;
  sharedAt: string | null;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SowSection({
  projectName,
  sows,
  initialVersion,
}: {
  leadId: string;
  projectName: string;
  sows: SowItem[];
  initialVersion?: number;
}) {
  const [selectedVersion, setSelectedVersion] = useState<number>(
    initialVersion || (sows.length > 0 ? sows[0].version : 0)
  );

  const selectedSow = sows.find((s) => s.version === selectedVersion) || sows[0];

  if (sows.length === 0) {
    return <p className="text-gray-500">No scope of work documents available yet.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-cyan-600 uppercase tracking-wider mb-1">Scope of Work</p>
        <h3 className="text-2xl font-bold text-gray-900">{projectName}</h3>
      </div>

      {/* Version Selector */}
      {sows.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-500 mb-2">Version</label>
          <div className="flex gap-2 flex-wrap">
            {sows.map((sow) => (
              <button
                key={sow.id}
                onClick={() => setSelectedVersion(sow.version)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedVersion === sow.version
                    ? "bg-cyan-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Version {selectedSow.version}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{selectedSow.fileName}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatFileSize(selectedSow.fileSize)} · Shared on{" "}
                  {selectedSow.sharedAt
                    ? new Date(selectedSow.sharedAt).toLocaleDateString()
                    : new Date(selectedSow.createdAt).toLocaleDateString()}
                </p>
                {selectedSow.comments && (
                  <p className="text-sm text-gray-600 mt-3 italic border-l-2 border-cyan-300 pl-3">
                    {selectedSow.comments}
                  </p>
                )}
              </div>
              <a
                href={selectedSow.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition flex-shrink-0"
              >
                Download
              </a>
            </div>
          </div>

          {/* PDF Preview */}
          {selectedSow.fileType === "application/pdf" && (
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
          {selectedSow.fileType !== "application/pdf" && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6 text-center">
              <p className="text-cyan-800 font-medium mb-2">
                This document is a Word file (.{selectedSow.fileName.split(".").pop()})
              </p>
              <p className="text-cyan-600 text-sm mb-4">
                Please download it to view the full scope of work.
              </p>
              <a
                href={selectedSow.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition"
              >
                Download Document
              </a>
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
                    ? "border-cyan-300 bg-cyan-50"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
                onClick={() => setSelectedVersion(sow.version)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Version {sow.version}</p>
                    {sow.comments && (
                      <p className="text-xs text-gray-500 mt-0.5">{sow.comments}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {sow.sharedAt ? new Date(sow.sharedAt).toLocaleDateString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
