"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  builds: { id: string; version: number; status: string; submittedAt: string }[];
  _count: { builds: number; enhancements: number; appStoreConfigs: number };
}

export default function AppFactoryListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/app-factory")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setProjects(d); })
      .finally(() => setLoading(false));
  }, []);

  const submitted = projects.filter((p) => ["SUBMITTED", "BUILDING"].includes(p.status));
  const other = projects.filter((p) => !["SUBMITTED", "BUILDING"].includes(p.status));

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

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No App Factory projects yet</p>
          <p className="text-sm text-gray-400">Projects will appear here when customers use App Factory to design and submit apps.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Needs attention: submitted / building */}
          {submitted.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Needs Attention ({submitted.length})
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                {renderTable(submitted, router)}
              </div>
            </div>
          )}

          {/* All other projects */}
          {other.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">All Projects</h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                {renderTable(other, router)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderTable(projects: Project[], router: ReturnType<typeof useRouter>) {
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Idea</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Build</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stores</th>
          <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
        {projects.map((p) => {
          const latestBuild = p.builds[0];
          return (
            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => router.push(`/app-factory/${p.id}`)}>
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
              <td className="px-5 py-4 text-sm text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
