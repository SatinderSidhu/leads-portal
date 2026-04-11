"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  IDEATING: { label: "Ideating", color: "bg-blue-100 text-blue-800", icon: "💡" },
  DESIGNING: { label: "Designing", color: "bg-purple-100 text-purple-800", icon: "🎨" },
  SUBMITTED: { label: "Submitted", color: "bg-yellow-100 text-yellow-800", icon: "📤" },
  BUILDING: { label: "Building", color: "bg-orange-100 text-orange-800", icon: "🔨" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-800", icon: "🎉" },
  ENHANCING: { label: "Enhancing", color: "bg-indigo-100 text-indigo-800", icon: "✨" },
};

const BUILD_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted", IN_REVIEW: "In Review", BUILDING: "Building",
  TESTING: "Testing", READY: "Ready", DELIVERED: "Delivered",
};

interface Project {
  id: string;
  publicId: string;
  status: string;
  idea: string;
  platforms: string[];
  createdAt: string;
  builds: { version: number; status: string; submittedAt: string }[];
  _count: { builds: number; enhancements: number };
}

export default function MyProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then(setUser).catch(() => {});
    fetch("/api/projects")
      .then((r) => {
        if (r.status === 401) { router.push("/login?returnTo=/projects"); return []; }
        return r.json();
      })
      .then((d) => { if (Array.isArray(d)) setProjects(d); })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          {user && <p className="text-sm text-gray-400 mt-0.5">Welcome back, {user.name}</p>}
        </div>
        <a
          href="/start"
          className="inline-flex items-center gap-2 bg-[#01358d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#012a70] transition"
        >
          + New Project
        </a>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading your projects...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#01358d]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#01358d]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">No projects yet</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Start by describing your app idea. Our AI will help you design screens and requirements.</p>
          <a href="/start" className="inline-flex items-center gap-2 bg-[#01358d] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#012a70] transition">
            Create Your First App
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project) => {
            const config = STATUS_CONFIG[project.status] || STATUS_CONFIG.IDEATING;
            const latestBuild = project.builds[0];

            return (
              <div
                key={project.id}
                onClick={() => router.push(`/project/${project.publicId}`)}
                className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-[#01358d]/30 transition cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(project.platforms as string[]).map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 capitalize">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Idea */}
                <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                  {project.idea.length > 150 ? project.idea.substring(0, 150) + "..." : project.idea}
                </p>

                {/* Build status */}
                {latestBuild && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-gray-50">
                    <span className="text-xs text-gray-400">Build v{latestBuild.version}:</span>
                    <span className="text-xs font-medium text-gray-700">{BUILD_STATUS_LABELS[latestBuild.status] || latestBuild.status}</span>

                    {/* Mini progress dots */}
                    <div className="flex gap-1 ml-auto">
                      {["SUBMITTED", "IN_REVIEW", "BUILDING", "TESTING", "READY", "DELIVERED"].map((s, i) => {
                        const currentIdx = ["SUBMITTED", "IN_REVIEW", "BUILDING", "TESTING", "READY", "DELIVERED"].indexOf(latestBuild.status);
                        return (
                          <div key={s} className={`w-2 h-2 rounded-full ${i <= currentIdx ? "bg-[#01358d]" : "bg-gray-200"}`} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {project._count.builds > 0 && <span>{project._count.builds} build{project._count.builds > 1 ? "s" : ""}</span>}
                    {project._count.enhancements > 0 && <span>{project._count.enhancements} enhancement{project._count.enhancements > 1 ? "s" : ""}</span>}
                  </div>
                  <span className="text-xs font-medium text-[#01358d] opacity-0 group-hover:opacity-100 transition">
                    Open →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
