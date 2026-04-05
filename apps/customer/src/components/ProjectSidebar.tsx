"use client";

import { ThemeToggle } from "./ThemeToggle";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  badge?: string | number | null;
  statusColor?: string;
  disabled?: boolean;
}

interface ProjectSidebarProps {
  projectName: string;
  leadId: string;
  activeTab: string;
  navItems: NavItem[];
  collapsed: boolean;
  hovered: boolean;
  locked: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onToggleCollapse: () => void;
  onToggleLock: () => void;
  session: { name: string; initials: string } | null;
  returnTo: string;
  v?: string;
}

/* ─── SVG Icons ─── */

function IconOverview({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function IconDocument({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconFlow({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function IconCalendar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

const NAV_ICONS: Record<string, typeof IconOverview> = {
  overview: IconOverview,
  document: IconDocument,
  flow: IconFlow,
  shield: IconShield,
  calendar: IconCalendar,
};

export default function ProjectSidebar({
  projectName,
  leadId,
  activeTab,
  navItems,
  collapsed,
  hovered,
  locked,
  onMouseEnter,
  onMouseLeave,
  onToggleCollapse,
  onToggleLock,
  session,
  returnTo,
  v,
}: ProjectSidebarProps) {
  const isExpanded = !collapsed || hovered;

  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed top-0 left-0 h-full z-40 bg-gradient-to-b from-[#01358d] to-[#0a1f5c] dark:from-[#0f1629] dark:to-[#0a0f1e] border-r border-white/10 flex flex-col transition-all duration-200 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/10">
        <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
        {isExpanded && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{projectName}</p>
            <p className="text-white/40 text-[10px]">Customer Portal</p>
          </div>
        )}
        {isExpanded && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Lock / Pin button */}
            <button
              onClick={onToggleLock}
              className={`p-1 rounded-md transition ${locked ? "text-[#f9556d]" : "text-white/30 hover:text-white/60"}`}
              title={locked ? "Unpin sidebar" : "Pin sidebar open"}
            >
              <svg className="w-3.5 h-3.5" fill={locked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            {/* Collapse button */}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-white/30 hover:text-white/60 transition"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ─── Back link ─── */}
      {session && (
        <a
          href="/"
          className={`flex items-center gap-2 mx-2 mt-2 px-2 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition text-xs ${
            !isExpanded ? "justify-center" : ""
          }`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {isExpanded && <span>My Projects</span>}
        </a>
      )}

      {/* ─── Navigation ─── */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {isExpanded && (
          <p className="text-white/30 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">Navigation</p>
        )}
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = activeTab === item.key;
          const href = `/project?id=${leadId}&tab=${item.key}${v ? `&v=${v}` : ""}`;

          if (item.disabled) {
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-white/20 cursor-default ${
                  !isExpanded ? "justify-center" : ""
                }`}
                title={isExpanded ? undefined : item.label}
              >
                {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                {isExpanded && (
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <span className="text-sm truncate">{item.label}</span>
                    <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full">Soon</span>
                  </div>
                )}
              </div>
            );
          }

          return (
            <a
              key={item.key}
              href={href}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 ${
                isActive
                  ? "bg-white/15 text-white shadow-sm border-l-2 border-[#f9556d]"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              } ${!isExpanded ? "justify-center" : ""}`}
              title={isExpanded ? undefined : item.label}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {isExpanded && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.statusColor && !item.badge && (
                    <div className={`w-2 h-2 rounded-full ${item.statusColor}`} />
                  )}
                </div>
              )}
              {!isExpanded && item.badge && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#f9556d]" />
              )}
            </a>
          );
        })}
      </nav>

      {/* ─── Bottom Section ─── */}
      <div className="border-t border-white/10 px-2 py-3 space-y-2">
        {/* Theme Toggle */}
        <div className={`flex items-center ${!isExpanded ? "justify-center" : "px-2"}`}>
          <ThemeToggle />
          {isExpanded && <span className="text-white/40 text-xs ml-2">Theme</span>}
        </div>

        {/* User Info */}
        {session ? (
          <div className={`flex items-center gap-2.5 px-2 py-2 rounded-xl ${!isExpanded ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{session.initials}</span>
            </div>
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{session.name}</p>
                <a href="/api/auth?logout=1" className="text-white/40 text-[10px] hover:text-white/70 transition">
                  Sign Out
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className={`flex flex-col gap-1 ${isExpanded ? "px-2" : "items-center"}`}>
            {isExpanded ? (
              <>
                <a href={`/login?returnTo=${returnTo}`} className="text-center text-xs text-white/60 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition">Sign In</a>
                <a href={`/register?returnTo=${returnTo}`} className="text-center text-xs text-white font-medium bg-white/15 hover:bg-white/25 py-1.5 rounded-lg transition">Create Account</a>
              </>
            ) : (
              <a href={`/login?returnTo=${returnTo}`} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition" title="Sign In">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* KITLabs branding */}
        {isExpanded && (
          <div className="text-center pt-2 border-t border-white/5">
            <p className="text-white/20 text-[9px]">&copy; {new Date().getFullYear()} KITLabs Inc</p>
          </div>
        )}
      </div>
    </aside>
  );
}
