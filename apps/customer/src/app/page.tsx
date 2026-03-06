import { prisma } from "@leads-portal/database";
import NdaSection from "../components/NdaSection";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500",
  DESIGN_READY: "bg-yellow-500",
  DESIGN_APPROVED: "bg-green-500",
  BUILD_IN_PROGRESS: "bg-orange-500",
  BUILD_READY_FOR_REVIEW: "bg-purple-500",
  BUILD_SUBMITTED: "bg-indigo-500",
  GO_LIVE: "bg-emerald-500",
};

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; tab?: string }>;
}) {
  const { id, tab } = await searchParams;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No Project ID Provided
          </h1>
          <p className="text-gray-500">
            Please use the link from your welcome email to access your project.
          </p>
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
    },
  });

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Project Not Found
          </h1>
          <p className="text-gray-500">
            The project you&apos;re looking for doesn&apos;t exist or the link
            may be incorrect.
          </p>
        </div>
      </div>
    );
  }

  const showNda = tab === "nda" && lead.nda;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Welcome, {lead.customerName}!
            </h1>
            <p className="text-white/80 text-lg">
              We&apos;re thrilled to have you on board
            </p>
          </div>

          {/* NDA Section (when tab=nda) */}
          {showNda && lead.nda ? (
            <NdaSection
              leadId={lead.id}
              projectName={lead.projectName}
              nda={{
                id: lead.nda.id,
                content: lead.nda.content,
                status: lead.nda.status,
                signerName: lead.nda.signerName,
                signedAt: lead.nda.signedAt
                  ? lead.nda.signedAt.toISOString()
                  : null,
                createdAt: lead.nda.createdAt.toISOString(),
              }}
            />
          ) : (
            /* Project Card */
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10">
              <div className="mb-6">
                <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-1">
                  Your Project
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {lead.projectName}
                </h2>
              </div>

              {/* Current Status */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Current Status
                </p>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Project Description
                </p>
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {lead.projectDescription}
                </p>
              </div>

              <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Contact Name
                    </p>
                    <p className="text-gray-900 font-medium">
                      {lead.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Email
                    </p>
                    <p className="text-gray-900 font-medium">
                      {lead.customerEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* NDA Banner (if NDA exists but not on NDA tab) */}
              {lead.nda && (
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">
                        Non-Disclosure Agreement
                      </p>
                      <p className="text-xs text-indigo-600">
                        {lead.nda.status === "SIGNED"
                          ? `Signed by ${lead.nda.signerName}`
                          : "Ready for your review and signature"}
                      </p>
                    </div>
                    <a
                      href={`?id=${lead.id}&tab=nda`}
                      className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      {lead.nda.status === "SIGNED" ? "View NDA" : "Review & Sign"}
                    </a>
                  </div>
                </div>
              )}

              {/* Status History Timeline */}
              {lead.statusHistory.length > 0 && (
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Status History
                  </p>
                  <div className="space-y-0">
                    {lead.statusHistory.map((entry, index) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              index === lead.statusHistory.length - 1
                                ? STATUS_COLORS[entry.toStatus] || "bg-gray-400"
                                : "bg-gray-300"
                            }`}
                          />
                          {index < lead.statusHistory.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 min-h-[28px]" />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-medium text-gray-900">
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

              {/* Admin Comments */}
              {lead.notes.length > 0 && (
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                    Comments from Our Team
                  </p>
                  <div className="space-y-3">
                    {lead.notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                      >
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-white/60 text-sm mt-8">
            If you have any questions, reach out to us and we&apos;ll be happy to
            help.
          </p>
        </div>
      </div>
    </div>
  );
}
