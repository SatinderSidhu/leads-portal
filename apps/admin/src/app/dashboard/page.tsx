"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../components/ThemeToggle";

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

const STAGE_LABELS: Record<string, string> = {
  COLD: "Cold",
  WARM: "Warm",
  HOT: "Hot",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

const STAGE_COLORS: Record<string, string> = {
  COLD: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  WARM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HOT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SOW_READY: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  SOW_SIGNED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  APP_FLOW_READY: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  DESIGN_READY: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DESIGN_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  BUILD_IN_PROGRESS: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  BUILD_READY_FOR_REVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  BUILD_SUBMITTED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  GO_LIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  AGENT: "Agent",
  BARK: "Bark",
};

interface AdminUser {
  id: string;
  name: string;
}

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
  assignedTo?: { id: string; name: string } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("me");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch admin users for assignedTo filter
  useEffect(() => {
    fetch("/api/admin-users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAdminUsers(data);
      })
      .catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async (page: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (stageFilter) params.set("stage", stageFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (assignedToFilter) params.set("assignedTo", assignedToFilter);

    const res = await fetch(`/api/leads?${params}`);
    if (!res.ok) {
      if (res.redirected || res.status === 401) router.push("/login");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setLeads(data.leads);
    setPagination(data.pagination);
    setLoading(false);
  }, [debouncedSearch, statusFilter, stageFilter, sourceFilter, assignedToFilter, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/kitlabs-logo.jpg" alt="KITLabs" className="h-9 object-contain" />
            <h1 className="text-xl font-bold text-[#01358d] dark:text-white">Leads Portal</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ThemeToggle />
            <button
              onClick={() => router.push("/")}
              className="bg-[#01358d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#012a70] transition"
            >
              Activity Feed
            </button>
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
              onClick={() => router.push("/sow-templates")}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              SOW Templates
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
              onClick={() => router.push("/branding")}
              className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition"
            >
              Branding
            </button>
            <button
              onClick={() => router.push("/leads/new")}
              className="bg-[#f9556d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e8445c] transition"
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
        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, city..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
              >
                <option value="">All Stages</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[130px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
              >
                <option value="">All Sources</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assigned To</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
              >
                <option value="me">My Leads</option>
                <option value="all">All Leads</option>
                {adminUsers.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name}</option>
                ))}
              </select>
            </div>
            {(search || statusFilter || stageFilter || sourceFilter || assignedToFilter !== "me") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter(""); setStageFilter(""); setSourceFilter(""); setAssignedToFilter("me"); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Leads {!loading && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({pagination.total} total)</span>}
          </h2>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading leads...</p>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {debouncedSearch || statusFilter || stageFilter || sourceFilter || assignedToFilter !== "me" ? "No leads match your filters" : "No leads assigned to you yet"}
            </p>
            {!(debouncedSearch || statusFilter || stageFilter || sourceFilter) && assignedToFilter === "me" && (
              <button
                onClick={() => router.push("/leads/new")}
                className="bg-[#f9556d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e8445c] transition"
              >
                Create your first lead
              </button>
            )}
          </div>
        ) : (
          <>
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
                        Assigned To
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
                            {SOURCE_LABELS[lead.source] || lead.source}
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
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {lead.assignedTo?.name || <span className="text-gray-400 italic">Unassigned</span>}
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLeads(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 2)
                    .reduce<(number | string)[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, i) =>
                      item === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => fetchLeads(item as number)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition ${
                            pagination.page === item
                              ? "bg-[#01358d] text-white"
                              : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => fetchLeads(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
