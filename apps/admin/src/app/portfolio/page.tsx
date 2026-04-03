"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  description: string;
  projects: { id: string; title: string; category: string | null }[];
}

interface Project {
  id: string;
  title: string;
  category: string | null;
  domain: string | null;
  customerName: string | null;
  service: { id: string; name: string } | null;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"services" | "projects">("services");

  useEffect(() => {
    Promise.all([
      fetch("/api/portfolio/services").then((r) => r.json()),
      fetch("/api/portfolio/projects").then((r) => r.json()),
    ]).then(([s, p]) => {
      setServices(Array.isArray(s) ? s : []);
      setProjects(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Services offered and projects completed by KITLabs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/portfolio/services/new")} className="bg-[#01358d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#012a70] transition">+ New Service</button>
          <button onClick={() => router.push("/portfolio/projects/new")} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition">+ New Project</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["services", "projects"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-[#01358d] text-white" : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            }`}
          >
            {t === "services" ? `Services (${services.length})` : `Projects (${projects.length})`}
          </button>
        ))}
      </div>

      {/* Services */}
      {tab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-full py-8 text-center">No services added yet.</p>
          ) : services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => router.push(`/portfolio/services/${svc.id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{svc.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{svc.description}</p>
              {svc.projects.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 font-medium uppercase mb-1">{svc.projects.length} Project{svc.projects.length !== 1 ? "s" : ""}</p>
                  <div className="flex flex-wrap gap-1">
                    {svc.projects.slice(0, 3).map((p) => (
                      <span key={p.id} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{p.title}</span>
                    ))}
                    {svc.projects.length > 3 && <span className="text-xs text-gray-400">+{svc.projects.length - 3} more</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {tab === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.length === 0 ? (
            <p className="text-gray-400 text-sm col-span-full py-8 text-center">No projects added yet.</p>
          ) : projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => router.push(`/portfolio/projects/${proj.id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 hover:shadow-md transition cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{proj.title}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {proj.service && <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">{proj.service.name}</span>}
                {proj.category && <span className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full">{proj.category}</span>}
                {proj.domain && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{proj.domain}</span>}
              </div>
              {proj.customerName && <p className="text-xs text-gray-500 mt-2">Client: {proj.customerName}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
