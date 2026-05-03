"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface KioskSignInModalProps {
  /** Called once redeem succeeds — receives the freshly-signed-in user. */
  onSignedIn: (user: { id: string; name: string; email: string }) => void;
  onCancel: () => void;
}

type Phase = "loading" | "waiting" | "linked" | "expired" | "error";

export default function KioskSignInModal({ onSignedIn, onCancel }: KioskSignInModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }

  async function startPairing() {
    stopTimers();
    setPhase("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/pair/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start pairing");
      const { token: t, qrUrl: url, expiresAt } = await res.json();
      setToken(t);
      setQrUrl(url);

      const png = await QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#01358d", light: "#ffffff" } });
      setQrDataUrl(png);
      setPhase("waiting");

      // Countdown
      const expires = new Date(expiresAt).getTime();
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.round((expires - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) {
          stopTimers();
          setPhase("expired");
        }
      };
      updateCountdown();
      tickRef.current = setInterval(updateCountdown, 1000);

      // Poll status every 2s
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/pair/${t}`, { cache: "no-store" });
          if (!r.ok) return;
          const data = await r.json();
          if (data.status === "LINKED") {
            stopTimers();
            setPhase("linked");
            // Redeem
            const redeem = await fetch(`/api/pair/${t}/redeem`, { method: "POST" });
            if (!redeem.ok) {
              const { error } = await redeem.json().catch(() => ({ error: "Redeem failed" }));
              setErrorMsg(error || "Redeem failed");
              setPhase("error");
              return;
            }
            const { user } = await redeem.json();
            onSignedIn(user);
          } else if (data.status === "EXPIRED") {
            stopTimers();
            setPhase("expired");
          }
        } catch {
          /* swallow transient errors */
        }
      }, 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to start pairing");
      setPhase("error");
    }
  }

  useEffect(() => {
    startPairing();
    return () => stopTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative">
        <button
          onClick={() => {
            stopTimers();
            onCancel();
          }}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Sign in with your phone</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Scan the QR code with your phone&apos;s camera. No password required.
        </p>

        {phase === "loading" && (
          <div className="py-16 text-center text-sm text-gray-500">Generating code…</div>
        )}

        {phase === "waiting" && qrDataUrl && (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-2xl border-4 border-[#01358d]/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR pairing code" className="w-72 h-72" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#01358d] animate-pulse" />
              <p className="text-sm text-gray-600">
                Waiting for your phone… <span className="font-mono text-gray-400 ml-1">{timeLabel}</span>
              </p>
            </div>
            <ol className="text-sm text-gray-600 space-y-2 bg-gray-50 rounded-xl p-4 mb-4">
              <li><span className="font-semibold text-gray-800">1.</span> Open your phone camera and point at the code</li>
              <li><span className="font-semibold text-gray-800">2.</span> Tap the link that appears</li>
              <li><span className="font-semibold text-gray-800">3.</span> Sign in with Google or LinkedIn on your phone</li>
              <li><span className="font-semibold text-gray-800">4.</span> Confirm — and the kiosk continues automatically</li>
            </ol>
            {qrUrl && (
              <p className="text-[11px] text-gray-400 text-center break-all">
                Or open this link manually: {qrUrl}
              </p>
            )}
          </>
        )}

        {phase === "linked" && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Phone confirmed — signing you in…</p>
          </div>
        )}

        {phase === "expired" && (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Code expired</h3>
            <p className="text-sm text-gray-500 mb-6">Codes are valid for 10 minutes.</p>
            <button
              onClick={startPairing}
              className="px-5 py-2.5 rounded-xl bg-[#01358d] hover:bg-[#012a70] text-white text-sm font-semibold transition"
            >
              Try again
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Pairing failed</h3>
            <p className="text-sm text-gray-500 mb-6">{errorMsg || "Something went wrong."}</p>
            <button
              onClick={startPairing}
              className="px-5 py-2.5 rounded-xl bg-[#01358d] hover:bg-[#012a70] text-white text-sm font-semibold transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
