"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 w-8 rounded-lg object-cover" />
          <div>
            <span className="text-sm font-bold text-[#01358d]">App Factory</span>
            <span className="text-[10px] text-gray-400 block -mt-0.5">by KITLabs</span>
          </div>
        </a>
        <div className="flex items-center gap-4">
          <a href="/start" className="text-sm text-gray-600 hover:text-[#01358d] transition">
            Start Building
          </a>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#01358d] flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="text-sm font-medium text-[#01358d] hover:text-[#012a70] transition"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
