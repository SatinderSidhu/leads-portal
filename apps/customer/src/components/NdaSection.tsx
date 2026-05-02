"use client";

import { useState, useEffect } from "react";
import { downloadNdaPdf, PdfBranding } from "../lib/generate-pdf";
import DocumentPreviewModal from "./DocumentPreviewModal";

interface NdaSectionProps {
  leadId: string;
  projectName: string;
  nda: {
    id: string;
    content: string;
    status: string;
    signerName: string | null;
    signedAt: string | null;
    createdAt: string;
    fileName: string | null;
    mimeType: string | null;
    uploadedExternally: boolean;
  };
}

export default function NdaSection({ leadId, projectName, nda }: NdaSectionProps) {
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(nda.status === "SIGNED");
  const [signedInfo, setSignedInfo] = useState<{
    name: string;
    date: string;
  } | null>(
    nda.status === "SIGNED" && nda.signerName
      ? { name: nda.signerName, date: nda.signedAt || "" }
      : null
  );

  // Branding for PDF export
  const [branding, setBranding] = useState<PdfBranding | undefined>(undefined);
  useEffect(() => {
    fetch("/api/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, []);

  async function handleSign() {
    setSigning(true);
    try {
      const res = await fetch("/api/nda/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, signerName: signerName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSigned(true);
        setSignedInfo({
          name: data.signerName,
          date: data.signedAt,
        });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to sign NDA");
      }
    } catch {
      alert("Failed to sign NDA");
    } finally {
      setSigning(false);
    }
  }

  function handleDownloadPdf() {
    downloadNdaPdf(nda.content, projectName, branding);
  }

  // ── Uploaded NDA file branch ───────────────────────────────
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);

  async function handleDownloadUploadedFile() {
    try {
      const res = await fetch(`/api/nda/file?leadId=${leadId}`);
      if (!res.ok) throw new Error("Download failed");
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
    } catch {
      alert("Failed to download NDA file");
    }
  }

  if (nda.fileName) {
    const signedDate = nda.signedAt
      ? new Date(nda.signedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-1">
              Non-Disclosure Agreement
            </p>
            <h2 className="text-2xl font-bold text-gray-900">{projectName}</h2>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex items-start gap-3">
          <svg className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-emerald-900">NDA on file</p>
            <p className="text-sm text-emerald-800 mt-0.5">
              A signed Non-Disclosure Agreement{nda.signerName ? ` from ${nda.signerName}` : ""}
              {signedDate ? ` (signed ${signedDate})` : ""} has been uploaded to your project. You can preview or download it below.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#01358d] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{nda.fileName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{nda.mimeType?.includes("pdf") ? "PDF document" : "Word document"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFilePreviewOpen(true)}
            className="px-5 py-3 bg-[#01358d] hover:bg-[#012a70] text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Preview
          </button>
          <button
            onClick={handleDownloadUploadedFile}
            className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            Download
          </button>
        </div>

        {filePreviewOpen && (
          <DocumentPreviewModal
            fileName={nda.fileName}
            mimeType={nda.mimeType || "application/pdf"}
            previewEndpoint={`/api/nda/file?leadId=${leadId}`}
            onClose={() => setFilePreviewOpen(false)}
            onDownload={handleDownloadUploadedFile}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-1">
            Non-Disclosure Agreement
          </p>
          <h2 className="text-2xl font-bold text-gray-900">{projectName}</h2>
        </div>
        <button
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download PDF
        </button>
      </div>

      {/* NDA Content */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 max-h-96 overflow-y-auto border border-gray-200">
        <pre className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {nda.content}
        </pre>
      </div>

      {/* Signed State */}
      {signed && signedInfo ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-1">
            NDA Signed Successfully
          </h3>
          <p className="text-green-700 text-sm">
            Signed by <strong>{signedInfo.name}</strong> on{" "}
            {new Date(signedInfo.date).toLocaleString()}
          </p>
        </div>
      ) : (
        /* Signature Form */
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sign this Agreement
          </h3>

          <div className="mb-4">
            <label
              htmlFor="signerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Legal Name
            </label>
            <input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900"
            />
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the terms of this Non-Disclosure Agreement.
              I understand that by typing my name and clicking &quot;Sign NDA&quot; below,
              I am providing my electronic signature.
            </span>
          </label>

          <button
            onClick={handleSign}
            disabled={!signerName.trim() || !agreed || signing}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg text-base font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {signing ? "Signing..." : "Sign NDA"}
          </button>
        </div>
      )}
    </div>
  );
}
