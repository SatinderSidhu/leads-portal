"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Project {
  id: string;
  publicId: string;
  status: string;
  idea: string;
  platforms: string[];
  customerName: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IDEATING: { label: "Ideating", color: "bg-blue-100 text-blue-800" },
  DESIGNING: { label: "Designing", color: "bg-purple-100 text-purple-800" },
  SUBMITTED: { label: "Submitted", color: "bg-yellow-100 text-yellow-800" },
  BUILDING: { label: "Building", color: "bg-orange-100 text-orange-800" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-800" },
  ENHANCING: { label: "Enhancing", color: "bg-indigo-100 text-indigo-800" },
};

export default function ProjectDashboard() {
  const params = useParams();
  const router = useRouter();
  const publicId = params.publicId as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${publicId}`)
      .then((r) => r.json())
      .then(setProject)
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) return <main className="max-w-4xl mx-auto px-6 py-16"><p className="text-gray-400">Loading project...</p></main>;
  if (!project) return <main className="max-w-4xl mx-auto px-6 py-16"><p className="text-gray-400">Project not found</p></main>;

  const status = STATUS_LABELS[project.status] || STATUS_LABELS.IDEATING;

  const tabs = [
    { label: "Design", href: `/project/${publicId}/design`, enabled: true },
    { label: "Build", href: `/project/${publicId}/build`, enabled: ["SUBMITTED", "BUILDING", "DELIVERED", "ENHANCING"].includes(project.status) },
    { label: "Enhance", href: `/project/${publicId}/enhance`, enabled: ["DELIVERED", "ENHANCING"].includes(project.status) },
    { label: "Status", href: `/project/${publicId}/status`, enabled: project.status !== "IDEATING" },
  ];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your App Project</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-xl truncate">{project.idea}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => tab.enabled && router.push(tab.href)}
            disabled={!tab.enabled}
            className={`p-4 rounded-xl border-2 text-left transition ${
              tab.enabled
                ? "border-gray-200 hover:border-[#01358d] hover:bg-[#01358d]/5 cursor-pointer"
                : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
            }`}
          >
            <div className="text-sm font-semibold text-gray-900">{tab.label}</div>
            <div className="text-xs text-gray-400 mt-1">
              {!tab.enabled ? "Available soon" : `Go to ${tab.label.toLowerCase()}`}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Original Idea</h2>
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{project.idea}</p>
        <div className="flex items-center gap-2 mt-4">
          {project.platforms.map((p: string) => (
            <span key={p} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{p}</span>
          ))}
        </div>
      </div>
    </main>
  );
}
