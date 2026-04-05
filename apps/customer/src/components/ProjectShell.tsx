"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import ProjectSidebar, { type NavItem } from "./ProjectSidebar";

const STORAGE_KEY = "customer-sidebar";

interface ProjectShellProps {
  projectName: string;
  leadId: string;
  activeTab: string;
  navItems: NavItem[];
  session: { name: string; initials: string } | null;
  returnTo: string;
  v?: string;
  children: ReactNode;
}

export default function ProjectShell({
  projectName,
  leadId,
  activeTab,
  navItems,
  session,
  returnTo,
  v,
  children,
}: ProjectShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [locked, setLocked] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.collapsed === "boolean") setCollapsed(parsed.collapsed);
        if (typeof parsed.locked === "boolean") setLocked(parsed.locked);
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed: next, locked }));
      } catch { /* ignore */ }
      return next;
    });
  }, [locked]);

  const handleToggleLock = useCallback(() => {
    setLocked((prev) => {
      const next = !prev;
      const nextCollapsed = next ? false : collapsed;
      if (next) setCollapsed(false);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed: nextCollapsed, locked: next }));
      } catch { /* ignore */ }
      return next;
    });
  }, [collapsed]);

  const handleMouseEnter = useCallback(() => {
    if (collapsed && !locked) setHovered(true);
  }, [collapsed, locked]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const isExpanded = !collapsed || hovered;
  const sidebarWidth = isExpanded ? "ml-64" : "ml-16";

  // Prevent layout flash before localStorage loads
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#01358d] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ─── Desktop Sidebar ─── */}
      <div className="hidden md:block">
        <ProjectSidebar
          projectName={projectName}
          leadId={leadId}
          activeTab={activeTab}
          navItems={navItems}
          collapsed={collapsed}
          hovered={hovered}
          locked={locked}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onToggleCollapse={handleToggleCollapse}
          onToggleLock={handleToggleLock}
          session={session}
          returnTo={returnTo}
          v={v}
        />
      </div>

      {/* ─── Mobile Top Bar ─── */}
      <div className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-[#01358d] to-[#2870a8] dark:from-[#0f1629] dark:to-[#1a2744] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1 text-white/80 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-7 rounded object-cover" />
          <p className="text-white text-sm font-semibold truncate max-w-[200px]">{projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          {session ? (
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{session.initials}</span>
            </div>
          ) : (
            <a href={`/login?returnTo=${returnTo}`} className="text-xs text-white/70 hover:text-white transition">Sign In</a>
          )}
        </div>
      </div>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed top-0 left-0 h-full z-50 w-72">
            <ProjectSidebar
              projectName={projectName}
              leadId={leadId}
              activeTab={activeTab}
              navItems={navItems}
              collapsed={false}
              hovered={false}
              locked={true}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
              onToggleCollapse={() => setMobileOpen(false)}
              onToggleLock={() => {}}
              session={session}
              returnTo={returnTo}
              v={v}
            />
          </div>
        </>
      )}

      {/* ─── Main Content ─── */}
      <main className={`transition-all duration-200 hidden md:block ${sidebarWidth}`}>
        {children}
      </main>
      <main className="md:hidden">
        {children}
      </main>
    </div>
  );
}
