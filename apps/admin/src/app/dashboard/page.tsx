"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  DESIGN_READY: "Design Ready",
  DESIGN_APPROVED: "Design Approved",
  BUILD_IN_PROGRESS: "Build In Progress",
  BUILD_READY_FOR_REVIEW: "Build Ready for Review",
  BUILD_SUBMITTED: "Build Submitted",
  GO_LIVE: "Go Live",
};

const STAGE_LABELS: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

const STAGE_COLORS: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-800",
  WARM: "bg-yellow-100 text-yellow-800",
  HOT: "bg-orange-100 text-orange-800",
  ACTIVE: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  DESIGN_READY: "bg-yellow-100 text-yellow-800",
  DESIGN_APPROVED: "bg-green-100 text-green-800",
  BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800",
  BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800",
  GO_LIVE: "bg-emerald-100 text-emerald-800",
};

interface Lead {
  id: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  projectDescription: string;
  source: string;
  status: string;
  stage: string;
  emailSent: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Leads Portal</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push("/profile")}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              My Profile
            </button>
            <button
              onClick={() => router.push("/admin-users")}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Admin Users
            </button>
            <button
              onClick={() => router.push("/email-templates")}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition"
            >
              Email Templates
            </button>
            <button
              onClick={() => router.push("/email-flows")}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition"
            >
              Email Flows
            </button>
            <button
              onClick={() => router.push("/content")}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition"
            >
              Content
            </button>
            <button
              onClick={() => router.push("/leads/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              + New Lead
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Leads</h2>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading leads...</p>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No leads yet</p>
            <button
              onClick={() => router.push("/leads/new")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              Create your first lead
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        {lead.projectName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lead.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {lead.customerEmail}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lead.source === "AGENT" ? "bg-cyan-100 text-cyan-800" : lead.source === "BARK" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {lead.source === "AGENT" ? "Agent" : lead.source === "BARK" ? "Bark" : "Manual"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-800"}`}
                        >
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage] || "bg-gray-100 text-gray-800"}`}
                        >
                          {STAGE_LABELS[lead.stage] || lead.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
