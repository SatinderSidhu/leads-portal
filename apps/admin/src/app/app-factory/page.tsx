"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppFactoryDeleteModal from "../../components/AppFactoryDeleteModal";

const STATUS_COLORS: Record<string, string> = {
  IDEATING: "bg-blue-100 text-blue-800",
  DESIGNING: "bg-purple-100 text-purple-800",
  SUBMITTED: "bg-yellow-100 text-yellow-800",
  BUILDING: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  ENHANCING: "bg-indigo-100 text-indigo-800",
};

const BUILD_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  BUILDING: "bg-orange-100 text-orange-700",
  TESTING: "bg-purple-100 text-purple-700",
  READY: "bg-teal-100 text-teal-700",
  DELIVERED: "bg-green-100 text-green-700",
};

const ALL_STATUSES = ["IDEATING", "DESIGNING", "SUBMITTED", "BUILDING", "DELIVERED", "ENHANCING"] as const;

type StatusFilter = "ALL" | (typeof ALL_STATUSES)[number];
type SortMode = "createdDesc" | "updatedDesc" | "createdAsc";

interface Project {
  id: string;
  publicId: string;
  status: string;
  idea: string;
  customerName: string | null;
  customerEmail: string | null;
  companyName: string | null;
  leadId: string | null;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
  builds: { id: string; version: number; status: string; submittedAt: string }[];
  _count: { builds: number; enhancements: number; appStoreConfigs: number };
}

export default function AppFactoryListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortMode>("createdDesc");
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/app-factory", { cache: "no-store" });
      const d = await res.json();
      if (Array.isArray(d)) setProjects(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Apply filter + sort client-side. List is bounded (admin tool), so this
  // beats round-trips on every dropdown change.
  const visible = useMemo(() => {
    const filtered = statusFilter === "ALL"
      ? projects
      : projects.filter((p) => p.status === statusFilter);
    const sorted = filtered.slice();
    if (sort === "updatedDesc") {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sort === "createdAsc") {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [projects, statusFilter, sort]);

  // Show the "Needs Attention" grouping only when no filter is applied — once
  // the admin filters by a specific status, the grouping becomes noise.
  const showGrouped = statusFilter === "ALL";
  const submitted = visible.filter((p) => ["SUBMITTED", "BUILDING"].includes(p.status));
  const other = visible.filter((p) => !["SUBMITTED", "BUILDING"].includes(p.status));

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: projects.length };
    for (const s of ALL_STATUSES) map[s] = 0;
    for (const p of projects) {
      if (map[p.status] !== undefined) map[p.status]++;
    }
    return map;
  }, [projects]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">App Factory</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""} — manage builds and track customer progress</p>
        </div>
        <a
          href="https://appfactory.kitlabs.us"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-teal-600 hover:text-teal-800 font-medium transition"
        >
          Open App Factory →
        </a>
      </div>

      {/* Filter + sort controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          >
            <option value="ALL">All ({statusCounts.ALL})</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()} ({statusCounts[s]})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#01358d]"
          >
            <option value="updatedDesc">Recent activity</option>
            <option value="createdDesc">Newest</option>
            <option value="createdAsc">Oldest</option>
          </select>
        </div>

        {(statusFilter !== "ALL" || sort !== "createdDesc") && (
          <button
            onClick={() => { setStatusFilter("ALL"); setSort("createdDesc"); }}
            className="text-xs text-gray-500 hover:text-[#01358d] dark:text-gray-400 dark:hover:text-blue-400 underline underline-offset-4"
          >
            Reset
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          Showing {visible.length} of {projects.length}
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          {projects.length === 0 ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-2">No App Factory projects yet</p>
              <p className="text-sm text-gray-400">Projects will appear here when customers use App Factory to design and submit apps.</p>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No projects match the current filter.</p>
          )}
        </div>
      ) : showGrouped ? (
        <div className="space-y-8">
          {submitted.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Needs Attention ({submitted.length})
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                <ProjectTable projects={submitted} router={router} onDelete={setDeleteTarget} />
              </div>
            </div>
          )}
          {other.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">All Projects</h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                <ProjectTable projects={other} router={router} onDelete={setDeleteTarget} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <ProjectTable projects={visible} router={router} onDelete={setDeleteTarget} />
        </div>
      )}

      {deleteTarget && (
        <AppFactoryDeleteModal
          project={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProjectTable({
  projects,
  router,
  onDelete,
}: {
  projects: Project[];
  router: ReturnType<typeof useRouter>;
  onDelete: (p: Project) => void;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Idea</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Build</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stores</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last activity</th>
          <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-12"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {projects.map((p) => {
          const latestBuild = p.builds[0];
          return (
            <tr
              key={p.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
              onClick={() => router.push(`/app-factory/${p.id}`)}
            >
              <td className="px-5 py-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{p.customerName || "—"}</div>
                <div className="text-xs text-gray-400">{p.customerEmail || "No email"}</div>
                {p.companyName && <div className="text-xs text-gray-400">{p.companyName}</div>}
              </td>
              <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{p.idea.substring(0, 80)}{p.idea.length > 80 ? "..." : ""}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-800"}`}>
                  {p.status}
                </span>
              </td>
              <td className="px-5 py-4">
                {latestBuild ? (
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${BUILD_STATUS_COLORS[latestBuild.status] || "bg-gray-100 text-gray-600"}`}>
                      v{latestBuild.version} — {latestBuild.status.replace("_", " ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">No build</span>
                )}
              </td>
              <td className="px-5 py-4">
                <span className="text-xs text-gray-500">{p._count.appStoreConfigs}/2</span>
              </td>
              <td className="px-5 py-4 text-sm text-gray-400">
                <div>{new Date(p.updatedAt).toLocaleDateString()}</div>
                <div className="text-[11px] text-gray-300 dark:text-gray-500">created {new Date(p.createdAt).toLocaleDateString()}</div>
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p); }}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                  title="Delete project"
                  aria-label="Delete project"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
