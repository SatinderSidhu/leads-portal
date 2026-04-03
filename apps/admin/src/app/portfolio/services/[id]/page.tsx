"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Service {
  id: string; name: string; description: string;
  emailScript: string | null; phoneScript: string | null; meetingScript: string | null;
  documents: { name: string; url: string }[];
  urls: { label: string; url: string }[];
  projects: Project[];
}

interface Project {
  id: string; title: string; category: string | null; domain: string | null;
  customerName: string | null; technologies: string[];
}

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", emailScript: "", phoneScript: "", meetingScript: "" });
  const [saving, setSaving] = useState(false);
  const [scriptTab, setScriptTab] = useState<"email" | "phone" | "meeting">("email");

  useEffect(() => {
    fetch(`/api/portfolio/services/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setService(data); setForm({ name: data.name, description: data.description, emailScript: data.emailScript || "", phoneScript: data.phoneScript || "", meetingScript: data.meetingScript || "" }); })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/portfolio/services/${params.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { const data = await res.json(); setService({ ...service!, ...data }); setEditing(false); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${service?.name}"? This will unlink all projects.`)) return;
    await fetch(`/api/portfolio/services/${params.id}`, { method: "DELETE" });
    router.push("/portfolio");
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>;
  if (!service) return <p className="text-gray-500 py-10 text-center">Service not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {editing ? (
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-[#01358d] outline-none w-full" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h1>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-[#01358d] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300">Edit</button>
              <button onClick={handleDelete} className="px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">Delete</button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
        {editing ? (
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-none" />
        ) : (
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{service.description}</p>
        )}
      </div>

      {/* URLs */}
      {service.urls.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Useful Links</h2>
          <div className="flex flex-wrap gap-2">
            {service.urls.map((u, i) => (
              <a key={i} href={u.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition">
                {u.label}
                <button onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(u.url); }} className="text-blue-400 hover:text-blue-600" title="Copy URL">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {service.documents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Documents & Decks</h2>
          <div className="space-y-2">
            {service.documents.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{d.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Pitch Scripts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pitch Scripts</h2>
        <div className="flex gap-2 mb-4">
          {(["email", "phone", "meeting"] as const).map((t) => (
            <button key={t} onClick={() => setScriptTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${scriptTab === t ? "bg-[#01358d] text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
              {t === "email" ? "Email Script" : t === "phone" ? "Phone Script" : "Meeting Script"}
            </button>
          ))}
        </div>
        {editing ? (
          <textarea
            value={scriptTab === "email" ? form.emailScript : scriptTab === "phone" ? form.phoneScript : form.meetingScript}
            onChange={(e) => setForm({ ...form, [scriptTab === "email" ? "emailScript" : scriptTab === "phone" ? "phoneScript" : "meetingScript"]: e.target.value })}
            rows={8} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 resize-none"
            placeholder={`Write your ${scriptTab} pitch script...`}
          />
        ) : (
          <div className="relative">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 min-h-[100px]">
              {(scriptTab === "email" ? service.emailScript : scriptTab === "phone" ? service.phoneScript : service.meetingScript) || <span className="text-gray-400 italic">No {scriptTab} script added yet.</span>}
            </pre>
            {(scriptTab === "email" ? service.emailScript : scriptTab === "phone" ? service.phoneScript : service.meetingScript) && (
              <button
                onClick={() => navigator.clipboard.writeText((scriptTab === "email" ? service.emailScript : scriptTab === "phone" ? service.phoneScript : service.meetingScript) || "")}
                className="absolute top-2 right-2 text-xs text-gray-400 hover:text-[#01358d] dark:hover:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600"
              >
                Copy
              </button>
            )}
          </div>
        )}
      </div>

      {/* Linked Projects */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Projects ({service.projects.length})</h2>
          <button onClick={() => router.push(`/portfolio/projects/new?serviceId=${service.id}`)} className="text-xs text-[#01358d] dark:text-blue-400 hover:underline font-medium">+ Add Project</button>
        </div>
        {service.projects.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No projects linked to this service yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {service.projects.map((p) => (
              <div key={p.id} onClick={() => router.push(`/portfolio/projects/${p.id}`)} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                <div className="flex gap-2 mt-1">
                  {p.category && <span className="text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded-full">{p.category}</span>}
                  {p.domain && <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">{p.domain}</span>}
                </div>
                {p.customerName && <p className="text-xs text-gray-400 mt-1">Client: {p.customerName}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
