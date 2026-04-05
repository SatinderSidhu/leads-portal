import { Suspense } from "react";
import { prisma } from "@leads-portal/database";
import NdaSection from "../../components/NdaSection";
import SowSection from "../../components/SowSection";
import AppFlowSection from "../../components/AppFlowSection";
import ProjectFeedback from "../../components/ProjectFeedback";
import NdaRequestCard from "../../components/NdaRequestCard";
import ProjectShell from "../../components/ProjectShell";
import VisitTracker from "../../components/VisitTracker";
import ChatWidget from "../../components/ChatWidget";
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

const TABS = [
  { key: "overview", label: "Overview", icon: "overview" },
  { key: "sow", label: "Scope of Work", icon: "document" },
  { key: "app-flow", label: "App Flow", icon: "flow" },
  { key: "nda", label: "NDA", icon: "shield" },
  { key: "appointments", label: "Book Meeting", icon: "calendar" },
];

/* ─── SVG Icons (used in page content) ─── */

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

function IconCalendar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
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
      assignedTo: { select: { name: true, email: true, profilePicture: true } },
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
  const adminBaseUrl = process.env.ADMIN_PORTAL_URL || "http://localhost:3000";
  const isLoggedIn = !!session;
  const returnTo = encodeURIComponent(`/project?id=${lead.id}&tab=${activeTab}${v ? `&v=${v}` : ""}`);
  const initials = lead.customerName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Build nav items for sidebar
  const navItems = [
    { key: "overview", label: "Overview", icon: "overview" },
    {
      key: "sow",
      label: "Scope of Work",
      icon: "document",
      badge: hasSow ? lead.scopeOfWorks.length : null,
      statusColor: hasSow ? (lead.scopeOfWorks[0]?.signedAt ? "bg-emerald-400" : "bg-cyan-400") : undefined,
      disabled: !hasSow,
    },
    {
      key: "app-flow",
      label: "App Flow",
      icon: "flow",
      badge: hasAppFlow ? lead.appFlows.length : null,
      disabled: !hasAppFlow,
    },
    {
      key: "nda",
      label: "NDA",
      icon: "shield",
      statusColor: hasNda ? (lead.nda!.status === "SIGNED" ? "bg-emerald-400" : "bg-amber-400") : undefined,
      disabled: !hasNda,
    },
    { key: "appointments", label: "Book Meeting", icon: "calendar" },
  ];

  const sessionData = session ? { name: session.name, initials } : null;

  return (
    <ProjectShell
      projectName={lead.projectName}
      leadId={lead.id}
      activeTab={activeTab}
      navItems={navItems}
      session={sessionData}
      returnTo={returnTo}
      v={v}
    >
      <Suspense fallback={null}><VisitTracker leadId={lead.id} page={activeTab} /></Suspense>

      <div className="min-h-screen">
        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="p-6 md:p-8 max-w-5xl">
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#01358d] to-[#2870a8] flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-white">{initials}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Welcome, {lead.customerName}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {lead.projectName}
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-[#01358d]/5 to-[#2870a8]/5 dark:from-[#01358d]/20 dark:to-[#2870a8]/20 rounded-2xl p-5 border border-[#01358d]/10 dark:border-[#01358d]/30">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  Welcome to your project portal with <span className="font-semibold text-[#01358d] dark:text-blue-400">KITLabs Inc</span>. This is your central hub where you can track your project&apos;s progress, review and approve important documents like your Scope of Work and NDA, explore your app&apos;s user flow designs, schedule meetings with our team, and communicate directly with us. Everything you need for your project is organized here in one place.
                </p>
              </div>
            </div>

            {/* Project Description + Representative */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Project Description — first thing after welcome */}
              {lead.projectDescription && (
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Project Description (as we know)</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{lead.projectDescription}</p>
                </div>
              )}

              {/* Your Representative */}
              <div className={`bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm ${!lead.projectDescription ? "lg:col-span-3" : ""}`}>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Your Representative</p>
                {lead.assignedTo ? (
                  <div className="flex flex-col items-center text-center">
                    {lead.assignedTo.profilePicture ? (
                      <img
                        src={`${adminBaseUrl}${lead.assignedTo.profilePicture}`}
                        alt={lead.assignedTo.name}
                        className="w-16 h-16 rounded-2xl object-cover mb-3"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#01358d] to-[#2870a8] flex items-center justify-center mb-3">
                        <span className="text-xl font-bold text-white">
                          {lead.assignedTo.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">{lead.assignedTo.name}</h4>
                    <p className="text-xs text-[#01358d] dark:text-blue-400 font-medium mt-0.5">Project Representative</p>
                    <a href={`mailto:${lead.assignedTo.email}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#01358d] dark:hover:text-blue-400 transition mt-1 break-all">
                      {lead.assignedTo.email}
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">A representative will be assigned shortly</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Project Started</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Cards — NDA first, then SOW, App Flow, Meeting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* NDA Card (with Request NDA functionality) */}
              <NdaRequestCard
                leadId={lead.id}
                customerName={lead.customerName}
                hasNda={hasNda}
                ndaStatus={lead.nda?.status}
                ndaSignerName={lead.nda?.signerName}
                isLoggedIn={isLoggedIn}
                returnTo={returnTo}
              />

              {/* SOW Card */}
              <a
                href={hasSow ? `/project?id=${lead.id}&tab=sow` : "#"}
                className={`group bg-white dark:bg-gray-900 rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
                  hasSow
                    ? "border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    : "border-dashed border-gray-200 dark:border-gray-700 opacity-60 cursor-default"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasSow ? "bg-cyan-100 dark:bg-cyan-900/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <IconDocument className={`w-5 h-5 ${hasSow ? "text-cyan-600 dark:text-cyan-400" : "text-gray-400"}`} />
                  </div>
                  {hasSow && <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 transition-colors" />}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Scope of Work</p>
                {hasSow ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{lead.scopeOfWorks.length} version{lead.scopeOfWorks.length !== 1 ? "s" : ""} available</p>
                    {lead.scopeOfWorks[0]?.signedAt && (
                      <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        <IconCheck className="w-3 h-3" /> Signed
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Not yet shared</p>
                )}
              </a>

              {/* App Flow Card */}
              <a
                href={hasAppFlow ? `/project?id=${lead.id}&tab=app-flow` : "#"}
                className={`group bg-white dark:bg-gray-900 rounded-2xl p-5 border shadow-sm transition-all duration-200 ${
                  hasAppFlow
                    ? "border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    : "border-dashed border-gray-200 dark:border-gray-700 opacity-60 cursor-default"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasAppFlow ? "bg-teal-100 dark:bg-teal-900/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <IconFlow className={`w-5 h-5 ${hasAppFlow ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`} />
                  </div>
                  {hasAppFlow && <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-teal-500 transition-colors" />}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">App Flow</p>
                {hasAppFlow ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lead.appFlows.length} flow{lead.appFlows.length !== 1 ? "s" : ""} shared</p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Not yet shared</p>
                )}
              </a>

              {/* Book Meeting Card */}
              <a
                href={`/project?id=${lead.id}&tab=appointments`}
                className="group bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <IconCalendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <IconArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Book a Meeting</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Schedule time with our team</p>
              </a>
            </div>

            {/* Status History Timeline */}
            {lead.statusHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
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
                              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          }`}>
                            {isLast && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          {!isLast && <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 min-h-[32px]" />}
                        </div>
                        <div className="pb-5 -mt-0.5">
                          <p className={`text-sm font-semibold ${isLast ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
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
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <IconCalendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
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

      {/* Chat Widget */}
      <ChatWidget
        leadId={lead.id}
        isLoggedIn={isLoggedIn}
        customerName={lead.customerName}
        returnTo={returnTo}
      />
    </ProjectShell>
  );
}
