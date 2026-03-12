import { prisma } from "@leads-portal/database";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../lib/session";

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
  NEW: "bg-blue-100 text-blue-800",
  SOW_READY: "bg-cyan-100 text-cyan-800",
  SOW_SIGNED: "bg-cyan-100 text-cyan-800",
  APP_FLOW_READY: "bg-teal-100 text-teal-800",
  DESIGN_READY: "bg-yellow-100 text-yellow-800",
  DESIGN_APPROVED: "bg-green-100 text-green-800",
  BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800",
  BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800",
  GO_LIVE: "bg-emerald-100 text-emerald-800",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string; v?: string }>;
}) {
  const { id, tab, v } = await searchParams;

  // If ?id= is present, redirect to project page (preserves old email links)
  if (id) {
    const params = new URLSearchParams({ id });
    if (tab) params.set("tab", tab);
    if (v) params.set("v", v);
    redirect(`/project?${params}`);
  }

  // Check if logged in
  const session = await getCustomerSession();

  if (!session || session.leadIds.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center">
            <img src="/kitlabs-logo.jpg" alt="KITLabs Inc" className="h-16 object-contain mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-3">Customer Portal</h1>
            <p className="text-white/80 text-lg mb-8">
              View your project details, scope of work, and more.
            </p>
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-4">
              {session ? (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No projects are linked to your account yet. Check your email for a project link.
                </p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Sign in to view your projects, or use the link from your email.
                  </p>
                  <a
                    href="/login"
                    className="block w-full bg-[#f9556d] hover:bg-[#e8445c] text-white py-3 rounded-lg font-medium transition text-center"
                  >
                    Sign In
                  </a>
                  <a
                    href="/register"
                    className="block w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center"
                  >
                    Create Account
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show project list for logged-in users
  const leads = await prisma.lead.findMany({
    where: { id: { in: session.leadIds } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      projectName: true,
      status: true,
      updatedAt: true,
      projectDescription: true,
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2870a8] via-[#01358d] to-[#101b63] dark:from-[#1a1a2e] dark:via-[#16213e] dark:to-[#0f3460]">
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20 dark:bg-black/20 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-8 object-contain" />
            <h1 className="text-lg font-bold text-white">Customer Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">{session.name}</span>
            <a href="/api/auth?logout=1" className="text-sm text-white/70 hover:text-white transition">
              Logout
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {session.name}!</h2>
        <p className="text-white/70 mb-8">Your projects</p>

        {leads.length === 0 ? (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No projects found. Check your email for a project link.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {leads.map((lead) => (
              <a
                key={lead.id}
                href={`/project?id=${lead.id}`}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:shadow-2xl hover:scale-[1.01] transition block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lead.projectName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {lead.projectDescription}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-800"}`}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Last updated: {new Date(lead.updatedAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
