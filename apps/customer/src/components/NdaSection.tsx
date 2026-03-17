"use client";

import { useState, useEffect } from "react";
import { downloadNdaPdf, PdfBranding } from "../lib/generate-pdf";

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
