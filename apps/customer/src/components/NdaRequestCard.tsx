"use client";

import { useState } from "react";
import NdaRequestModal from "./NdaRequestModal";

interface NdaRequestCardProps {
  leadId: string;
  customerName: string;
  hasNda: boolean;
  ndaStatus?: string | null;
  ndaSignerName?: string | null;
  isLoggedIn: boolean;
  returnTo: string;
}

function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function IconCheck({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

export default function NdaRequestCard({ leadId, customerName, hasNda, ndaStatus, ndaSignerName, isLoggedIn, returnTo }: NdaRequestCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [requested, setRequested] = useState(false);

  if (hasNda) {
    return (
      <a
        href={`/project?id=${leadId}&tab=nda`}
        className="group bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <IconShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Non-Disclosure Agreement</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {ndaStatus === "SIGNED" ? `Signed by ${ndaSignerName}` : "Ready for review"}
        </p>
        {ndaStatus === "SIGNED" && (
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            <IconCheck /> Signed
          </span>
        )}
      </a>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <IconShield className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Non-Disclosure Agreement</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Not yet shared</p>
        {requested ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <IconCheck className="w-3.5 h-3.5" />
            Request sent — we&apos;ll get back to you soon
          </span>
        ) : isLoggedIn ? (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#01358d] dark:text-blue-400 hover:text-[#012a6e] dark:hover:text-blue-300 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Request NDA
          </button>
        ) : (
          <a
            href={`/login?returnTo=${returnTo}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#01358d] dark:text-blue-400 hover:underline"
          >
            Sign in to request NDA
          </a>
        )}
      </div>

      {showModal && (
        <NdaRequestModal
          leadId={leadId}
          customerName={customerName}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setRequested(true);
          }}
        />
      )}
    </>
  );
}
