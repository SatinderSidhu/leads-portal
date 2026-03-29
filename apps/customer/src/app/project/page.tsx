import { prisma } from "@leads-portal/database";
import NdaSection from "../../components/NdaSection";
import SowSection from "../../components/SowSection";
import AppFlowSection from "../../components/AppFlowSection";
import ProjectFeedback from "../../components/ProjectFeedback";
import { getCustomerSession } from "../../lib/session";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  SOW_READY: "SOW Ready",
  SOW_SIGNED: "SOW Signed",
  APP_FLOW_READY: "App Flow Ready",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
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
  { key: "overview", label: "Project Overview" },
  { key: "sow", label: "Scope of Work" },
  { key: "app-flow", label: "App Flow" },
  { key: "nda", label: "NDA" },
  { key: "appointments", label: "Book Meeting" },
];

export default async function ProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string; v?: string }>;
}) {
  const { id, tab, v } = await searchParams;
  const session = await getCustomerSession();

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Project ID Provided</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please use the link from your welcome email to access your project.
          </p>
          <a href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Go to Portal</a>
        </div>
      </div>
    );
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Project Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400">
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
    // Update session object so the rest of the page reflects the link
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
      {/* Nav */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20 dark:bg-black/20 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 object-contain" />
            {session && (
              <a href="/" className="text-white/70 hover:text-white text-sm transition">&larr; My Projects</a>
            )}
            <h1 className="text-lg font-bold text-white">{lead.projectName}</h1>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-white/80">{session.name}</span>
                <a href="/api/auth?logout=1" className="text-sm text-white/70 hover:text-white transition">Logout</a>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <a href={`/login?returnTo=${returnTo}`} className="text-sm text-white/80 hover:text-white transition">Sign In</a>
                <a href={`/register?leadId=${lead.id}&returnTo=${returnTo}`} className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition">Create Account</a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Welcome + Status Banner */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-4">
        <h2 className="text-3xl font-bold text-white mb-1">
          Welcome, {lead.customerName}!
        </h2>
        <p className="text-white/70">
          Current status: <span className="text-white font-medium">{STATUS_LABELS[lead.status] || lead.status}</span>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex gap-1 bg-white/10 rounded-t-xl p-1">
          {TABS.map((t) => {
            const isDisabled = (t.key === "sow" && !hasSow) || (t.key === "app-flow" && !hasAppFlow) || (t.key === "nda" && !hasNda) || (t.key === "appointments" && !hasAppointments);
            if (isDisabled) return null;
            return (
              <a
                key={t.key}
                href={`/project?id=${lead.id}&tab=${t.key}${v ? `&v=${v}` : ""}`}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === t.key
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {t.label}
              </a>
            );
          })}

        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white/95 backdrop-blur-sm rounded-b-2xl rounded-tr-2xl shadow-2xl dark:bg-gray-900/95">
          {activeTab === "overview" && (
            <div className="p-8 md:p-10">
              {/* Project Info */}
              <div className="mb-6">
                <p className="text-sm font-medium text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">Your Project</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{lead.projectName}</h3>
              </div>

              {/* Current Status Badge */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current Status</p>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[#01358d]/10 text-[#01358d] dark:bg-blue-500/20 dark:text-blue-300">
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>

              {/* Description */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Project Description</p>
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{lead.projectDescription}</p>
              </div>

              {/* Contact Info */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Contact Name</p>
                    <p className="text-gray-900 dark:text-white font-medium">{lead.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-gray-900 dark:text-white font-medium">{lead.customerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Quick Links to SOW/App Flow/NDA */}
              {(hasSow || hasAppFlow || hasNda) && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hasSow && (
                    <a
                      href={`/project?id=${lead.id}&tab=sow`}
                      className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 hover:shadow-md transition block dark:bg-cyan-900/20 dark:border-cyan-800"
                    >
                      <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">Scope of Work</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400">{lead.scopeOfWorks.length} version(s) available</p>
                    </a>
                  )}
                  {hasAppFlow && (
                    <a
                      href={`/project?id=${lead.id}&tab=app-flow`}
                      className="bg-teal-50 border border-teal-200 rounded-xl p-4 hover:shadow-md transition block dark:bg-teal-900/20 dark:border-teal-800"
                    >
                      <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">App Flow</p>
                      <p className="text-xs text-teal-600 dark:text-teal-400">{lead.appFlows.length} flow(s) shared</p>
                    </a>
                  )}
                  {hasNda && (
                    <a
                      href={`/project?id=${lead.id}&tab=nda`}
                      className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 hover:shadow-md transition block dark:bg-indigo-900/20 dark:border-indigo-800"
                    >
                      <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Non-Disclosure Agreement</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400">
                        {lead.nda!.status === "SIGNED" ? `Signed by ${lead.nda!.signerName}` : "Ready for review"}
                      </p>
                    </a>
                  )}
                </div>
              )}

              {/* Status History Timeline */}
              {lead.statusHistory.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Status History</p>
                  <div className="space-y-0">
                    {lead.statusHistory.map((entry, index) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            index === lead.statusHistory.length - 1
                              ? STATUS_COLORS[entry.toStatus] || "bg-gray-400"
                              : "bg-gray-300"
                          }`} />
                          {index < lead.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 min-h-[28px]" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments / Feedback */}
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
          )}

          {activeTab === "sow" && hasSow && (
            <div className="p-8 md:p-10">
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

          {activeTab === "app-flow" && hasAppFlow && (
            <div className="p-8 md:p-10">
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

          {activeTab === "nda" && hasNda && lead.nda && (
            <div className="p-8 md:p-10">
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

          {activeTab === "appointments" && (
            <div className="p-8 md:p-10">
              <div className="mb-6">
                <p className="text-sm font-medium text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">Schedule a Meeting</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Book an Appointment</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Choose a convenient time to discuss your project with our team.</p>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
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

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <p className="text-center text-white/60 text-sm">
          If you have any questions, reach out to us and we&apos;ll be happy to help.
        </p>
      </div>
    </div>
  );
}
