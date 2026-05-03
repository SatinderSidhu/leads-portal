"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; profilePicture?: string | null } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        setUser(u);
        if (u) {
          // Also fetch profile picture
          fetch("/api/profile").then((r) => r.ok ? r.json() : null).then((p) => {
            if (p?.profilePicture) setUser((prev) => prev ? { ...prev, profilePicture: p.profilePicture } : prev);
          }).catch(() => {});
          // Fetch unread count
          fetch("/api/notifications?unread=1").then((r) => r.ok ? r.json() : null).then((d) => {
            if (d?.unreadCount) setUnreadCount(d.unreadCount);
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetch("/api/notifications?unread=1").then((r) => r.ok ? r.json() : null).then((d) => {
        if (d) setUnreadCount(d.unreadCount || 0);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function handleLogout() {
    if (!confirm("Sign out and clear this session? Anyone using this kiosk after you will start fresh.")) return;
    await fetch("/api/auth", { method: "DELETE" });
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          <div className="leading-tight">
            <span className="text-sm font-bold text-[#01358d] whitespace-nowrap block">App Factory</span>
            <span className="text-[10px] text-gray-400 whitespace-nowrap block">by KITLabs</span>
          </div>
        </a>
        <div className="flex items-center gap-4 flex-shrink-0">
          <a href="/start" className="hidden sm:inline text-sm text-gray-600 hover:text-[#01358d] transition whitespace-nowrap">
            Start Building
          </a>
          {user ? (
            <div className="flex items-center gap-3">
              <a href="/projects" className="hidden sm:inline text-sm text-gray-600 hover:text-[#01358d] transition whitespace-nowrap">
                My Projects
              </a>

              {/* Inbox */}
              <a href="/inbox" className="relative p-1.5 rounded-lg text-gray-500 hover:text-[#01358d] hover:bg-gray-100 transition flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </a>

              {/* Profile */}
              <a href="/profile" className="flex items-center gap-2 hover:opacity-80 transition flex-shrink-0">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#01358d] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 hidden sm:block whitespace-nowrap">{user.name}</span>
              </a>

              <button
                onClick={handleLogout}
                title="Sign out and clear this session — recommended at the end of a kiosk session"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f9556d]/10 hover:bg-[#f9556d] text-[#f9556d] hover:text-white text-xs font-semibold transition whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Sign out & finish
              </button>
            </div>
          ) : (
            <a href="/login" className="text-sm font-medium text-[#01358d] hover:text-[#012a70] transition whitespace-nowrap">
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
