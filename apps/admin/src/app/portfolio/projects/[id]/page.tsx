"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Project {
  id: string; title: string; description: string;
  category: string | null; domain: string | null; technologies: string[];
  customerName: string | null; customerDetail: string | null;
  demoVideoUrl: string | null; documents: { name: string; url: string }[];
  emailScript: string | null; phoneScript: string | null; meetingScript: string | null;
  completedAt: string | null; createdAt: string;
  service: { id: string; name: string } | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptTab, setScriptTab] = useState<"email" | "phone" | "meeting">("email");

  useEffect(() => {
    fetch(`/api/portfolio/projects/${params.id}`)
      .then((r) => r.json())
      .then(setProject)
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleDelete() {
    if (!confirm(`Delete "${project?.title}"?`)) return;
    await fetch(`/api/portfolio/projects/${params.id}`, { method: "DELETE" });
    router.push("/portfolio");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>;
  if (!project) return <p className="text-gray-500 py-10 text-center">Project not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {project.service && (
              <button onClick={() => router.push(`/portfolio/services/${project.service!.id}`)} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition">{project.service.name}</button>
            )}
            {project.category && <span className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full">{project.category}</span>}
            {project.domain && <span className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{project.domain}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/portfolio/projects/new?editId=${project.id}`)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">Edit</button>
          <button onClick={handleDelete} className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Project Details</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.description}</p>
          </div>

          {/* Info Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
            <div className="grid grid-cols-2 gap-4">
              {project.customerName && (
                <div><p className="text-xs text-gray-500 uppercase">Client</p><p className="text-sm font-medium text-gray-900 dark:text-white">{project.customerName}</p></div>
              )}
              {project.completedAt && (
                <div><p className="text-xs text-gray-500 uppercase">Completed</p><p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(project.completedAt).toLocaleDateString()}</p></div>
              )}
              {project.technologies.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase mb-1">Technologies</p>
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.map((t, i) => (
                      <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Detail */}
          {project.customerDetail && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Client Details</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{project.customerDetail}</p>
            </div>
          )}

          {/* Demo Video */}
          {project.demoVideoUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Demo Video</h2>
              <a href={project.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#01358d] dark:text-blue-400 hover:underline break-all">{project.demoVideoUrl}</a>
            </div>
          )}

          {/* Documents */}
          {project.documents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents</h2>
              <div className="space-y-2">
                {project.documents.map((d, i) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-sm text-gray-700 dark:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {d.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — Pitch Scripts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 h-fit">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pitch Scripts</h2>
          <div className="flex gap-2 mb-4">
            {(["email", "phone", "meeting"] as const).map((t) => (
              <button key={t} onClick={() => setScriptTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${scriptTab === t ? "bg-[#01358d] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 min-h-[150px]">
              {(scriptTab === "email" ? project.emailScript : scriptTab === "phone" ? project.phoneScript : project.meetingScript) || <span className="text-gray-400 italic">No {scriptTab} script added yet.</span>}
            </pre>
            {(scriptTab === "email" ? project.emailScript : scriptTab === "phone" ? project.phoneScript : project.meetingScript) && (
              <button
                onClick={() => navigator.clipboard.writeText((scriptTab === "email" ? project.emailScript : scriptTab === "phone" ? project.phoneScript : project.meetingScript) || "")}
                className="absolute top-2 right-2 text-xs text-gray-400 hover:text-[#01358d] bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
