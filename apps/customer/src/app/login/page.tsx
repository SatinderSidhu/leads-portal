"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Save returnTo in localStorage as backup
  useEffect(() => {
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      localStorage.setItem("customer-returnTo", returnTo);
    }
  }, [returnTo]);

  // Show OAuth error messages
  useEffect(() => {
    if (oauthError === "oauth_denied") {
      setError("Sign in was cancelled. Please try again.");
    } else if (oauthError === "oauth_no_email") {
      setError("Could not get your email from the provider. Please try another method.");
    } else if (oauthError) {
      setError("Social sign in failed. Please try again or use email.");
    }
  }, [oauthError]);

  function getRedirectUrl(): string {
    const stored = localStorage.getItem("customer-returnTo");
    const target = returnTo || stored || "/";
    localStorage.removeItem("customer-returnTo");
    return target.startsWith("/") && !target.startsWith("//") ? target : "/";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push(getRedirectUrl());
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const socialReturnTo = returnTo
    ? `?returnTo=${encodeURIComponent(returnTo)}`
    : "";
  const registerUrl = `/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        <a
          href={`/api/auth/google${socialReturnTo}`}
          className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium text-gray-700 dark:text-gray-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white dark:bg-gray-900 text-gray-400">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white dark:bg-gray-800"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white dark:bg-gray-800"
            placeholder="Enter password"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#f9556d] text-white py-2.5 rounded-lg font-medium hover:bg-[#e8445c] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <a href={registerUrl} className="text-[#01358d] dark:text-blue-400 font-medium hover:underline">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/kitlabs-logo.jpg" alt="KITLabs Inc" className="h-16 object-contain mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-3">Customer Portal</h1>
            <p className="text-white/80 text-lg">Sign in to your account</p>
          </div>

          <Suspense fallback={<div className="bg-white/95 rounded-2xl shadow-2xl p-8 animate-pulse h-96" />}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-white/60 text-sm mt-6">
            Or use the link from your email to access your project directly.
          </p>
        </div>
      </div>
    </div>
  );
}
