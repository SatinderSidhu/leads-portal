"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Breadcrumbs from "./Breadcrumbs";

const NO_SHELL_ROUTES = ["/login"];
const STORAGE_KEY = "sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function handleToggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  // Don't show sidebar on login page
  if (NO_SHELL_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  const isExpanded = !collapsed || hovered;
  const sidebarWidth = isExpanded ? "ml-56" : "ml-16";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        collapsed={collapsed}
        hovered={hovered}
        onMouseEnter={() => { if (collapsed) setHovered(true); }}
        onMouseLeave={() => setHovered(false)}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className={`${sidebarWidth} transition-all duration-200`}>
        {/* Top breadcrumb bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-3">
          <Breadcrumbs />
        </header>
        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
