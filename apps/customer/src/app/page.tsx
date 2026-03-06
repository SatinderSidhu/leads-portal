import { prisma } from "@leads-portal/database";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

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

  const lead = await prisma.lead.findUnique({ where: { id } });

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

          {/* Project Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-10">
            <div className="mb-6">
              <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider mb-1">
                Your Project
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                {lead.projectName}
              </h2>
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
          </div>

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
