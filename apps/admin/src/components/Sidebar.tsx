"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { href: "/dashboard", label: "Leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/messages", label: "Live Chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", badge: true },
  { href: "/meetings", label: "Meetings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/activity", label: "Activity Feed", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { type: "divider" as const },
  { href: "/portfolio", label: "Portfolio", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { type: "divider" as const },
  { href: "/email-templates", label: "Email Templates", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/sow-templates", label: "SOW Templates", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/questionnaires", label: "Questionnaires", icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/email-flows", label: "Email Flows", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/sequences", label: "Smart Sequences", icon: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" },
  { href: "/lists", label: "Contact Lists", icon: "M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" },
  { href: "/content", label: "Content", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" },
  { type: "divider" as const },
  { href: "/app-factory", label: "App Factory", icon: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437" },
  { type: "divider" as const },
  { href: "/branding", label: "Branding", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" },
  { href: "/zoho-settings", label: "Zoho CRM", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { href: "/notification-settings", label: "Communications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { type: "divider" as const },
  { href: "/naics-codes", label: "NAICS Codes", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/knowledge", label: "Knowledge Base", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { type: "divider" as const },
  { href: "/admin-users", label: "Admin Users", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/profile", label: "My Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/releases", label: "Release History", icon: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z" },
];

interface SidebarProps {
  collapsed: boolean;
  hovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, hovered, onMouseEnter, onMouseLeave, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const isExpanded = !collapsed || hovered;

  // Poll for unread message count
  useEffect(() => {
    function fetchUnread() {
      fetch("/api/messages?unread=1")
        .then((r) => r.ok ? r.json() : { unreadCount: 0 })
        .then((d) => setUnreadCount(d.unreadCount || 0))
        .catch(() => {});
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-40 transition-all duration-200 ${
        isExpanded ? "w-56" : "w-16"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className="px-3 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div
          className="flex items-center gap-2.5 cursor-pointer min-w-0"
          onClick={() => router.push("/")}
        >
          <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          {isExpanded && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-[#01358d] dark:text-white leading-tight whitespace-nowrap">Leads Portal</p>
              <p className="text-[10px] text-gray-400 whitespace-nowrap">KITLabs Inc</p>
            </div>
          )}
        </div>
        {isExpanded && (
          <button
            onClick={onToggleCollapse}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition flex-shrink-0 p-1"
            title={collapsed ? "Lock open" : "Collapse"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <><path d="M15 3h6v18h-6"/><path d="M9 12H3m6 0l-3-3m3 3l-3 3"/></>
              ) : (
                <><path d="M3 3h6v18H3"/><path d="M15 12h6m-6 0l3-3m-3 3l3 3"/></>
              )}
            </svg>
          </button>
        )}
      </div>

      {/* New Lead button */}
      <div className="px-3 py-3">
        <button
          onClick={() => router.push("/leads/new")}
          className={`w-full bg-[#f9556d] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#e8445c] transition flex items-center justify-center gap-1.5 ${!isExpanded ? "px-0" : ""}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M12 5v14M5 12h14"/></svg>
          {isExpanded && "New Lead"}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {NAV_ITEMS.map((item, i) => {
          if ("type" in item && item.type === "divider") {
            return <div key={`d-${i}`} className="my-2 border-t border-gray-100 dark:border-gray-800" />;
          }
          const nav = item as { href: string; label: string; icon: string };
          const isActive = pathname === nav.href || (nav.href !== "/" && pathname.startsWith(nav.href));
          return (
            <button
              key={nav.href}
              onClick={() => router.push(nav.href)}
              title={!isExpanded ? nav.label : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition mb-0.5 relative ${
                isActive
                  ? "bg-[#01358d] text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              } ${!isExpanded ? "justify-center px-2" : ""}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <path d={nav.icon} />
              </svg>
              {isExpanded && <span className="whitespace-nowrap overflow-hidden flex-1">{nav.label}</span>}
              {nav.href === "/messages" && unreadCount > 0 && (
                <span className={`bg-red-500 text-white text-[10px] font-bold rounded-full flex-shrink-0 ${isExpanded ? "px-1.5 py-0.5" : "w-2 h-2 absolute top-0 right-0"}`}>
                  {isExpanded ? String(unreadCount) : ""}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
        {isExpanded ? (
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ThemeToggle />
          </div>
        )}
      </div>
    </aside>
  );
}
