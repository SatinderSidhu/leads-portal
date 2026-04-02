"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Breadcrumbs from "./Breadcrumbs";

const NO_SHELL_ROUTES = ["/login"];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show sidebar on login page
  if (NO_SHELL_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="ml-56">
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
