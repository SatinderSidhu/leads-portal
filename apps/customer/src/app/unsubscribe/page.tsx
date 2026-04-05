"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const leadIdParam = searchParams.get("leadId") || "";

  const [email, setEmail] = useState(emailParam);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  async function handleUnsubscribe() {
    if (!email.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), leadId: leadIdParam || undefined }),
      });
      if (res.ok) {
        setResult("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong.");
        setResult("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">You&apos;ve Been Unsubscribed</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            You will no longer receive email communications from us for this project. If you change your mind, please reach out to our team.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#01358d] dark:text-blue-400 hover:underline"
          >
            Go to Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-12 mx-auto mb-4 rounded-lg" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unsubscribe from Emails</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            We&apos;re sorry to see you go. If you unsubscribe, you will no longer receive project updates, document notifications, or other communications from us via email.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-[#01358d] transition"
              readOnly={!!emailParam}
            />
          </div>

          {result === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg mb-4">{errorMsg}</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleUnsubscribe}
              disabled={!email.trim() || submitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Processing..." : "Unsubscribe"}
            </button>
            <a
              href="/"
              className="w-full py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-center rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition block"
            >
              Cancel &mdash; I changed my mind
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} KITLabs Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#01358d] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <UnsubscribeForm />
    </Suspense>
  );
}
