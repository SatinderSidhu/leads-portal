"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface SignedInUser {
  id: string;
  name: string;
  email: string;
}

interface KioskSignInModalProps {
  /** Called once any sign-in method succeeds (QR redeem or email/password). */
  onSignedIn: (user: SignedInUser) => void;
  /** Called before Google OAuth redirect — caller should persist any in-progress form state. */
  onBeforeRedirect?: () => void;
  onCancel: () => void;
  /** Where the OAuth flow should land after success. Defaults to current path. */
  returnTo?: string;
}

type Phase = "loading" | "waiting" | "linked" | "expired" | "error";

export default function KioskSignInModal({ onSignedIn, onBeforeRedirect, onCancel, returnTo }: KioskSignInModalProps) {
  // ── QR pairing state ──
  const [phase, setPhase] = useState<Phase>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(600);
  const [qrError, setQrError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Email/password sign-in state ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const effectiveReturnTo = returnTo || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/start");

  function stopTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  }

  async function startPairing() {
    stopTimers();
    setPhase("loading");
    setQrError(null);
    try {
      const res = await fetch("/api/pair/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start pairing");
      const { token: t, qrUrl: url, expiresAt } = await res.json();
      setQrUrl(url);

      const png = await QRCode.toDataURL(url, { width: 280, margin: 1, color: { dark: "#01358d", light: "#ffffff" } });
      setQrDataUrl(png);
      setPhase("waiting");

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

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/pair/${t}`, { cache: "no-store" });
          if (!r.ok) return;
          const data = await r.json();
          if (data.status === "LINKED") {
            stopTimers();
            setPhase("linked");
            const redeem = await fetch(`/api/pair/${t}/redeem`, { method: "POST" });
            if (!redeem.ok) {
              const { error } = await redeem.json().catch(() => ({ error: "Redeem failed" }));
              setQrError(error || "Redeem failed");
              setPhase("error");
              return;
            }
            const { user } = await redeem.json();
            onSignedIn(user);
          } else if (data.status === "EXPIRED") {
            stopTimers();
            setPhase("expired");
          }
        } catch { /* swallow transient */ }
      }, 2000);
    } catch (err) {
      setQrError(err instanceof Error ? err.message : "Failed to start pairing");
      setPhase("error");
    }
  }

  useEffect(() => {
    startPairing();
    return () => stopTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(error || "Login failed");
      }
      const user = await res.json();
      stopTimers();
      onSignedIn(user);
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSigningIn(false);
    }
  }

  function handleGoogleClick() {
    onBeforeRedirect?.();
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(effectiveReturnTo)}`;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-auto relative">
        <button
          onClick={() => { stopTimers(); onCancel(); }}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition z-10"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* ── Left: traditional sign-in ── */}
          <div className="p-8 md:border-r md:border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">Use your account to continue.</p>

            <button
              onClick={handleGoogleClick}
              className="flex items-center justify-center gap-3 w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {signInError && (
              <p className="text-red-500 text-xs text-center mb-3">{signInError}</p>
            )}

            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-2.5 bg-[#01358d] text-white rounded-xl font-medium text-sm hover:bg-[#012a70] disabled:opacity-50 transition"
              >
                {signingIn ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Don&apos;t have an account?{" "}
              <a
                href={`/register?returnTo=${encodeURIComponent(effectiveReturnTo)}`}
                onClick={() => onBeforeRedirect?.()}
                className="text-[#01358d] font-medium hover:underline"
              >
                Create one
              </a>
            </p>
          </div>

          {/* ── Right: QR pairing ── */}
          <div className="p-8 bg-gradient-to-br from-[#01358d]/5 to-[#2870a8]/5">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Scan with phone</h2>
            <p className="text-sm text-gray-500 mb-6">No typing — sign in from your phone in seconds.</p>

            {phase === "loading" && (
              <div className="py-12 text-center text-sm text-gray-500">Generating code…</div>
            )}

            {phase === "waiting" && qrDataUrl && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-2xl border-4 border-[#01358d]/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="QR pairing code" className="w-60 h-60" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#01358d] animate-pulse" />
                  <p className="text-xs text-gray-600">
                    Waiting for your phone… <span className="font-mono text-gray-400 ml-1">{timeLabel}</span>
                  </p>
                </div>
                <ol className="text-xs text-gray-600 space-y-1.5">
                  <li><span className="font-semibold text-gray-800">1.</span> Point your phone camera at the code</li>
                  <li><span className="font-semibold text-gray-800">2.</span> Tap the link that pops up</li>
                  <li><span className="font-semibold text-gray-800">3.</span> Sign in to your account on the phone</li>
                  <li><span className="font-semibold text-gray-800">4.</span> Confirm — kiosk continues automatically</li>
                </ol>
              </>
            )}

            {phase === "linked" && (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Phone confirmed — signing you in…</p>
              </div>
            )}

            {phase === "expired" && (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Code expired</h3>
                <p className="text-xs text-gray-500 mb-4">Codes are valid for 10 minutes.</p>
                <button onClick={startPairing} className="px-4 py-2 rounded-xl bg-[#01358d] hover:bg-[#012a70] text-white text-xs font-semibold transition">
                  Try again
                </button>
              </div>
            )}

            {phase === "error" && (
              <div className="py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-red-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Pairing failed</h3>
                <p className="text-xs text-gray-500 mb-4">{qrError || "Something went wrong."}</p>
                <button onClick={startPairing} className="px-4 py-2 rounded-xl bg-[#01358d] hover:bg-[#012a70] text-white text-xs font-semibold transition">
                  Retry
                </button>
              </div>
            )}

            {qrUrl && phase === "waiting" && (
              <p className="text-[10px] text-gray-400 text-center break-all mt-4">
                Or open: {qrUrl}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
