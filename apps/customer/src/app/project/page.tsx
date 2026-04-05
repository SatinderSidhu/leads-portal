import { Suspense } from "react";
import { prisma } from "@leads-portal/database";
import NdaSection from "../../components/NdaSection";
import SowSection from "../../components/SowSection";
import AppFlowSection from "../../components/AppFlowSection";
import ProjectFeedback from "../../components/ProjectFeedback";
import VisitTracker from "../../components/VisitTracker";
import ChatWidget from "../../components/ChatWidget";
import { ThemeToggle } from "../../components/ThemeToggle";
import { getCustomerSession } from "../../lib/session";

/* ─── Constants ─── */

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SOW_READY: "SOW Ready",
  SOW_SIGNED: "SOW Signed",
  APP_FLOW_READY: "App Flow Ready",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Ready for Review",
  BUILD_SUBMITTED: "Submitted",
  GO_LIVE: "Go Live",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  SOW_READY: "bg-cyan-500",
  SOW_SIGNED: "bg-cyan-600",
  APP_FLOW_READY: "bg-teal-500",
  DESIGN_READY: "bg-yellow-500",
  DESIGN_APPROVED: "bg-green-500",
  BUILD_IN_PROGRESS: "bg-orange-500",
  BUILD_READY_FOR_REVIEW: "bg-purple-500",
  BUILD_SUBMITTED: "bg-indigo-500",
  GO_LIVE: "bg-emerald-500",
};

const PIPELINE_STAGES = [
  { key: "NEW", label: "New", short: "New" },
  { key: "SOW_READY", label: "SOW Ready", short: "SOW" },
  { key: "SOW_SIGNED", label: "SOW Signed", short: "Signed" },
  { key: "APP_FLOW_READY", label: "App Flow", short: "Flow" },
  { key: "DESIGN_READY", label: "Design", short: "Design" },
  { key: "DESIGN_APPROVED", label: "Approved", short: "Approved" },
  { key: "BUILD_IN_PROGRESS", label: "Building", short: "Build" },
  { key: "BUILD_READY_FOR_REVIEW", label: "Review", short: "Review" },
  { key: "BUILD_SUBMITTED", label: "Submitted", short: "Submit" },
  { key: "GO_LIVE", label: "Go Live", short: "Live" },
];

function getStageIndex(status: string): number {
  const idx = PIPELINE_STAGES.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const TABS = [
  { key: "overview", label: "Overview", icon: "overview" },
  { key: "sow", label: "Scope of Work", icon: "document" },
  { key: "app-flow", label: "App Flow", icon: "flow" },
  { key: "nda", label: "NDA", icon: "shield" },
  { key: "appointments", label: "Book Meeting", icon: "calendar" },
];

/* ─── SVG Icons ─── */

function IconOverview({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function IconDocument({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function IconFlow({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function IconCheck({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconUser({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconChat({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

const TAB_ICONS: Record<string, typeof IconOverview> = {
  overview: IconOverview,
  document: IconDocument,
  flow: IconFlow,
  shield: IconShield,
  calendar: IconCalendar,
};

/* ─── Page ─── */

export default async function ProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string; v?: string }>;
}) {
  const { id, tab, v } = await searchParams;
  const session = await getCustomerSession();

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
            <IconDocument className="w-8 h-8 text-white/60" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">No Project ID Provided</h1>
          <p className="text-white/60 mb-6 leading-relaxed">
            Please use the link from your welcome email to access your project portal.
          </p>
          <a href="/" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition">
            Go to Portal
          </a>
        </div>
      </div>
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: {
        where: { createdBy: { endsWith: "(Customer)" } },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      nda: true,
      scopeOfWorks: {
        where: { sharedAt: { not: null } },
        orderBy: { version: "desc" },
        include: {
          sowComments: { orderBy: { createdAt: "asc" } },
        },
      },
      appFlows: {
        where: { sharedAt: { not: null } },
        include: {
          comments: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Project Not Found</h1>
          <p className="text-white/60 leading-relaxed">
            The project you&apos;re looking for doesn&apos;t exist or the link may be incorrect.
          </p>
        </div>
      </div>
    );
  }

  // Auto-link this lead to the logged-in user's account if not already linked
  if (session && !session.leadIds.includes(id)) {
    const updatedLeadIds = [...(session.leadIds as string[]), id];
    await prisma.customerUser.update({
      where: { id: session.id },
      data: { leadIds: updatedLeadIds },
    });
    session.leadIds = updatedLeadIds;
  }

  const activeTab = tab && TABS.some((t) => t.key === tab) ? tab : "overview";
  const hasSow = lead.scopeOfWorks.length > 0;
  const hasAppFlow = lead.appFlows.length > 0;
  const hasNda = !!lead.nda;
  const hasAppointments = true;
  const adminBaseUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const isLoggedIn = !!session;
  const returnTo = encodeURIComponent(`/project?id=${lead.id}&tab=${activeTab}${v ? `&v=${v}` : ""}`);
  const currentStage = getStageIndex(lead.status);
  const initials = lead.customerName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
      <Suspense fallback={null}><VisitTracker leadId={lead.id} page={activeTab} /></Suspense>

      {/* ─── Nav ─── */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/15 dark:bg-black/20 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 object-contain" />
            {session && (
              <a href="/" className="text-white/60 hover:text-white text-sm transition flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                My Projects
              </a>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {session ? (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{initials}</span>
                </div>
                <span className="text-sm text-white/80 hidden sm:inline">{session.name}</span>
                <a href="/api/auth?logout=1" className="text-xs text-white/50 hover:text-white transition">Logout</a>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href={`/login?returnTo=${returnTo}`} className="text-sm text-white/70 hover:text-white transition">Sign In</a>
                <a href={`/register?leadId=${lead.id}&returnTo=${returnTo}`} className="text-sm bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg transition font-medium">Create Account</a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-2">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <p className="text-white/50 text-sm font-medium mb-1">Project Portal</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {lead.projectName}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-lg">
              Welcome back, <span className="text-white font-medium">{lead.customerName}</span>. Track your project progress, review documents, and collaborate with our team.
            </p>
          </div>
          <div className="flex-shrink-0 md:text-right">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[lead.status] || "bg-gray-400"}`} />
              <span className="text-sm font-semibold text-white">
                {STATUS_LABELS[lead.status] || lead.status}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Progress Stepper (desktop) ─── */}
        <div className="hidden md:block bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between relative">
            {/* Connector line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-white/10" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-[#f9556d] transition-all duration-500"
              style={{ width: `${(currentStage / (PIPELINE_STAGES.length - 1)) * 100}%` }}
            />
            {PIPELINE_STAGES.map((stage, i) => {
              const isCompleted = i < currentStage;
              const isCurrent = i === currentStage;
              return (
                <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ width: `${100 / PIPELINE_STAGES.length}%` }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#f9556d] text-white"
                      : isCurrent
                        ? "bg-white text-[#01358d] ring-4 ring-[#f9556d]/40"
                        : "bg-white/10 text-white/30 border border-white/20"
                  }`}>
                    {isCompleted ? (
                      <IconCheck className="w-4 h-4" />
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-2 font-medium text-center leading-tight ${
                    isCompleted || isCurrent ? "text-white" : "text-white/30"
                  }`}>
                    {stage.short}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Progress Stepper (mobile) ─── */}
        <div className="md:hidden bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-medium">Project Progress</span>
            <span className="text-white text-xs font-bold">Step {currentStage + 1} of {PIPELINE_STAGES.length}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#f9556d] rounded-full transition-all duration-500"
              style={{ width: `${((currentStage + 1) / PIPELINE_STAGES.length) * 100}%` }}
            />
          </div>
          <p className="text-white font-medium text-sm mt-2">{PIPELINE_STAGES[currentStage]?.label || lead.status}</p>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex gap-1 overflow-x-auto bg-white/5 backdrop-blur-sm rounded-t-2xl p-1.5 border-x border-t border-white/10 scrollbar-hide">
          {TABS.map((t) => {
            const isDisabled = (t.key === "sow" && !hasSow) || (t.key === "app-flow" && !hasAppFlow) || (t.key === "nda" && !hasNda) || (t.key === "appointments" && !hasAppointments);
            if (isDisabled) return null;
            const TabIcon = TAB_ICONS[t.icon];
            const badge =
              t.key === "sow" ? lead.scopeOfWorks.length :
              t.key === "app-flow" ? lead.appFlows.length :
              null;
            return (
              <a
                key={t.key}
                href={`/project?id=${lead.id}&tab=${t.key}${v ? `&v=${v}` : ""}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                  activeTab === t.key
                    ? "bg-white text-gray-900 shadow-lg shadow-black/10 dark:bg-gray-800 dark:text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {TabIcon && <TabIcon className="w-4 h-4" />}
                {t.label}
                {badge && badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === t.key
                      ? "bg-[#01358d]/10 text-[#01358d] dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-white/15 text-white/80"
                  }`}>
                    {badge}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <div className="bg-white backdrop-blur-sm rounded-b-2xl rounded-tr-2xl shadow-2xl dark:bg-gray-900 border-x border-b border-white/10">

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <div className="p-6 md:p-8">
              {/* Two-column layout: Project + Contact */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Project Details Card */}
                <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">Project Details</p>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{lead.projectName}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      lead.status === "GO_LIVE"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "bg-[#01358d]/10 text-[#01358d] dark:bg-blue-500/20 dark:text-blue-300"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[lead.status] || "bg-gray-400"}`} />
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </div>
                  {lead.projectDescription && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Description</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{lead.projectDescription}</p>
                    </div>
                  )}
                </div>

                {/* Contact Card */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#01358d] to-[#2870a8] flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-white">{initials}</span>
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{lead.customerName}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{lead.customerEmail}</p>
                  {lead.phone && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lead.phone}</p>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 w-full">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Project started</p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Action Cards */}
              {(hasSow || hasAppFlow || hasNda) && (
                <div className="mb-8">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Your Documents</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {hasSow && (
                      <a
                        href={`/project?id=${lead.id}&tab=sow`}
                        className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                            <IconDocument className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Scope of Work</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lead.scopeOfWorks.length} version{lead.scopeOfWorks.length !== 1 ? "s" : ""} available</p>
                        {lead.scopeOfWorks[0]?.signedAt && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                            <IconCheck className="w-3 h-3" /> Signed
                          </span>
                        )}
                      </a>
                    )}
                    {hasAppFlow && (
                      <a
                        href={`/project?id=${lead.id}&tab=app-flow`}
                        className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                            <IconFlow className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                          <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">App Flow</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lead.appFlows.length} flow{lead.appFlows.length !== 1 ? "s" : ""} shared</p>
                      </a>
                    )}
                    {hasNda && (
                      <a
                        href={`/project?id=${lead.id}&tab=nda`}
                        className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                            <IconShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Non-Disclosure Agreement</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {lead.nda!.status === "SIGNED" ? `Signed by ${lead.nda!.signerName}` : "Ready for review"}
                        </p>
                        {lead.nda!.status === "SIGNED" && (
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                            <IconCheck className="w-3 h-3" /> Signed
                          </span>
                        )}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              {lead.statusHistory.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50 mb-8">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-5">Project Timeline</p>
                  <div className="space-y-0">
                    {lead.statusHistory.map((entry, index) => {
                      const isLast = index === lead.statusHistory.length - 1;
                      return (
                        <div key={entry.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isLast
                                ? `${STATUS_COLORS[entry.toStatus] || "bg-blue-500"} border-transparent`
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                            }`}>
                              {isLast && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            {!isLast && (
                              <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 min-h-[32px]" />
                            )}
                          </div>
                          <div className="pb-5 -mt-0.5">
                            <p className={`text-sm font-semibold ${
                              isLast ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                            }`}>
                              {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {" at "}
                              {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments / Feedback */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-4">
                  <IconChat className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Comments & Feedback</p>
                </div>
                <ProjectFeedback
                  leadId={lead.id}
                  initialNotes={lead.notes.map((n) => ({
                    id: n.id,
                    content: n.content,
                    createdBy: n.createdBy,
                    createdAt: n.createdAt.toISOString(),
                  }))}
                  isLoggedIn={isLoggedIn}
                  returnTo={returnTo}
                />
              </div>
            </div>
          )}

          {/* ── SOW Tab ── */}
          {activeTab === "sow" && hasSow && (
            <div className="p-5 md:p-8">
              <SowSection
                leadId={lead.id}
                projectName={lead.projectName}
                sows={lead.scopeOfWorks.map((s) => ({
                  id: s.id,
                  version: s.version,
                  fileName: s.fileName,
                  filePath: s.filePath && s.filePath.startsWith("/uploads/") ? `${adminBaseUrl}${s.filePath}` : s.filePath,
                  fileSize: s.fileSize,
                  fileType: s.fileType,
                  content: s.content,
                  comments: s.comments,
                  sharedAt: s.sharedAt ? s.sharedAt.toISOString() : null,
                  createdAt: s.createdAt.toISOString(),
                  signedAt: s.signedAt ? s.signedAt.toISOString() : null,
                  signerName: s.signerName,
                  sowComments: s.sowComments.map((c) => ({
                    id: c.id,
                    content: c.content,
                    authorName: c.authorName,
                    authorType: c.authorType,
                    createdAt: c.createdAt.toISOString(),
                  })),
                }))}
                initialVersion={v ? parseInt(v) : undefined}
                isLoggedIn={isLoggedIn}
                returnTo={returnTo}
              />
            </div>
          )}

          {/* ── App Flow Tab ── */}
          {activeTab === "app-flow" && hasAppFlow && (
            <div className="p-5 md:p-8">
              <AppFlowSection
                leadId={lead.id}
                isLoggedIn={isLoggedIn}
                returnTo={returnTo}
                flows={lead.appFlows.map((f) => ({
                  id: f.id,
                  name: f.name,
                  description: f.description,
                  flowType: f.flowType,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nodes: f.nodes as any[],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  edges: f.edges as any[],
                  sharedAt: f.sharedAt ? f.sharedAt.toISOString() : null,
                  comments: f.comments.map((c) => ({
                    id: c.id,
                    content: c.content,
                    authorName: c.authorName,
                    authorType: c.authorType,
                    createdAt: c.createdAt.toISOString(),
                  })),
                }))}
              />
            </div>
          )}

          {/* ── NDA Tab ── */}
          {activeTab === "nda" && hasNda && lead.nda && (
            <div className="p-5 md:p-8">
              <NdaSection
                leadId={lead.id}
                projectName={lead.projectName}
                nda={{
                  id: lead.nda.id,
                  content: lead.nda.content,
                  status: lead.nda.status,
                  signerName: lead.nda.signerName,
                  signedAt: lead.nda.signedAt ? lead.nda.signedAt.toISOString() : null,
                  createdAt: lead.nda.createdAt.toISOString(),
                }}
              />
            </div>
          )}

          {/* ── Appointments Tab ── */}
          {activeTab === "appointments" && (
            <div className="p-5 md:p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#01358d]/10 dark:bg-blue-500/20 flex items-center justify-center">
                    <IconCalendar className="w-5 h-5 text-[#01358d] dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Book a Meeting</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose a convenient time to discuss your project.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <iframe
                  width="100%"
                  height="750px"
                  src="https://satinder-kitlabs.zohobookings.com/portal-embed#/kitlabsinc"
                  frameBorder="0"
                  allowFullScreen
                  className="bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── KITLabs Resources ─── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 md:p-8">
          <div className="text-center mb-6">
            <h3 className="text-base font-semibold text-white mb-1">Explore KITLabs</h3>
            <p className="text-white/50 text-sm">Discover our tools, services, and resources</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <a href="https://kitlabs.us/portfolio" target="_blank" rel="noopener noreferrer" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" /></svg>
              </div>
              <p className="text-white font-medium text-sm">Portfolio</p>
              <p className="text-white/40 text-xs mt-0.5">Our work</p>
            </a>
            <a href="https://kitlabs.us/app-cost-estimator" target="_blank" rel="noopener noreferrer" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              </div>
              <p className="text-white font-medium text-sm">Cost Estimator</p>
              <p className="text-white/40 text-xs mt-0.5">Get estimates</p>
            </a>
            <a href="https://kitlabs.us/app-builder" target="_blank" rel="noopener noreferrer" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" /></svg>
              </div>
              <p className="text-white font-medium text-sm">App Builder</p>
              <p className="text-white/40 text-xs mt-0.5">Build your app</p>
            </a>
            <a href="https://kitlabs.us/my-digital-card" target="_blank" rel="noopener noreferrer" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" /></svg>
              </div>
              <p className="text-white font-medium text-sm">Digital Card</p>
              <p className="text-white/40 text-xs mt-0.5">Business card</p>
            </a>
            <a href="https://kitlabs.us/support" target="_blank" rel="noopener noreferrer" className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 text-center transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>
              </div>
              <p className="text-white font-medium text-sm">Support</p>
              <p className="text-white/40 text-xs mt-0.5">Get help</p>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6 pt-5 border-t border-white/10">
            <a href="https://kitlabs.us/services" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition">Services</a>
            <a href="https://kitlabs.us/industries" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition">Industries</a>
            <a href="https://kitlabs.us/about-kitlabs" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition">About</a>
            <a href="https://kitlabs.us/contact-us" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition">Contact</a>
            <a href="https://kitlabs.us/book-us" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white text-sm transition">Book a Meeting</a>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 opacity-60" />
            <p className="text-white/40 text-sm">KITLabs Inc &mdash; Mobile &amp; Web Platform</p>
          </div>
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} KITLabs Inc. All rights reserved.
          </p>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget
        leadId={lead.id}
        isLoggedIn={isLoggedIn}
        customerName={lead.customerName}
        returnTo={returnTo}
      />
    </div>
  );
}
