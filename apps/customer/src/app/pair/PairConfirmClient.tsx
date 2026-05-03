"use client";

import { useState } from "react";

export default function PairConfirmClient({
  token,
  userName,
  userEmail,
}: {
  token: string;
  userName: string;
  userEmail: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pair/${token}/link`, { method: "POST" });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Pairing failed" }));
        throw new Error(error || "Pairing failed");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
        {done ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re signed in</h1>
            <p className="text-sm text-gray-600">Return to the kiosk — it&apos;ll continue automatically.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#01358d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in on the kiosk?</h1>
            <p className="text-sm text-gray-600 mb-1">
              You&apos;re about to sign in to <strong>KITLabs App Factory</strong> on the kiosk as
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-left">
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{userEmail}</p>
            </div>

            {error && (
              <div className="px-4 py-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 text-left">
                {error}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full px-4 py-3 rounded-xl bg-[#01358d] hover:bg-[#012a70] text-white font-semibold text-sm transition disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Confirm and continue on kiosk"}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Only confirm if you&apos;re standing at the kiosk that showed the QR code.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
