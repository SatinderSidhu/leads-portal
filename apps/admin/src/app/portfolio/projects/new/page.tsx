"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm";

interface Service { id: string; name: string }

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const preServiceId = searchParams.get("serviceId");
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [techInput, setTechInput] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", serviceId: preServiceId || "",
    category: "", domain: "", customerName: "", customerDetail: "",
    demoVideoUrl: "", emailScript: "", phoneScript: "", meetingScript: "",
    completedAt: "",
  });
  const [techs, setTechs] = useState<string[]>([]);
  const [docs, setDocs] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    fetch("/api/portfolio/services").then((r) => r.json()).then((d) => setServices(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/portfolio/projects/${editId}`).then((r) => r.json()).then((p) => {
      setForm({
        title: p.title || "", description: p.description || "", serviceId: p.service?.id || "",
        category: p.category || "", domain: p.domain || "", customerName: p.customerName || "",
        customerDetail: p.customerDetail || "", demoVideoUrl: p.demoVideoUrl || "",
        emailScript: p.emailScript || "", phoneScript: p.phoneScript || "", meetingScript: p.meetingScript || "",
        completedAt: p.completedAt ? new Date(p.completedAt).toISOString().slice(0, 10) : "",
      });
      setTechs(Array.isArray(p.technologies) ? p.technologies : []);
      setDocs(Array.isArray(p.documents) ? p.documents : []);
    });
  }, [editId]);

  async function handleSave() {
    if (!form.title.trim()) { alert("Project title is required"); return; }
    setSaving(true);
    const url = editId ? `/api/portfolio/projects/${editId}` : "/api/portfolio/projects";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, technologies: techs, documents: docs, serviceId: form.serviceId || null }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/portfolio/projects/${editId || data.id}`);
    } else alert("Failed to save project");
    setSaving(false);
  }

  function addTech() {
    if (techInput.trim() && !techs.includes(techInput.trim())) {
      setTechs([...techs, techInput.trim()]);
      setTechInput("");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{editId ? "Edit Project" : "New Project"}</h1>

      {/* Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Title *</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. FinTech Mobile Banking App" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={inputClass + " resize-none"} placeholder="Project details..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
            <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} className={inputClass}>
              <option value="">No service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} placeholder="e.g. FinTech, Healthcare" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
            <input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className={inputClass} placeholder="e.g. Finance, Education" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Completed Date</label>
            <input type="date" value={form.completedAt} onChange={(e) => setForm({ ...form, completedAt: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technologies</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {techs.map((t, i) => (
              <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full flex items-center gap-1">
                {t} <button onClick={() => setTechs(techs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }} className={inputClass} placeholder="Add technology..." />
            <button onClick={addTech} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">Add</button>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Client Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name</label>
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputClass} placeholder="Client name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Demo Video URL</label>
            <input value={form.demoVideoUrl} onChange={(e) => setForm({ ...form, demoVideoUrl: e.target.value })} className={inputClass} placeholder="https://youtube.com/..." />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Details</label>
          <textarea value={form.customerDetail} onChange={(e) => setForm({ ...form, customerDetail: e.target.value })} rows={3} className={inputClass + " resize-none"} placeholder="Additional client information..." />
        </div>
      </div>

      {/* Pitch Scripts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pitch Scripts</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Script</label>
          <textarea value={form.emailScript} onChange={(e) => setForm({ ...form, emailScript: e.target.value })} rows={3} className={inputClass + " resize-none"} placeholder="Email pitch..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Script</label>
          <textarea value={form.phoneScript} onChange={(e) => setForm({ ...form, phoneScript: e.target.value })} rows={3} className={inputClass + " resize-none"} placeholder="Phone script..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Script</label>
          <textarea value={form.meetingScript} onChange={(e) => setForm({ ...form, meetingScript: e.target.value })} rows={3} className={inputClass + " resize-none"} placeholder="Meeting script..." />
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documents / Decks</h2>
        {docs.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input value={d.name} onChange={(e) => { const n = [...docs]; n[i].name = e.target.value; setDocs(n); }} className={inputClass} placeholder="Name" />
            <input value={d.url} onChange={(e) => { const n = [...docs]; n[i].url = e.target.value; setDocs(n); }} className={inputClass} placeholder="URL" />
            <button onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="text-red-500 text-sm">Remove</button>
          </div>
        ))}
        <button onClick={() => setDocs([...docs, { name: "", url: "" }])} className="text-sm text-[#01358d] dark:text-blue-400 font-medium">+ Add Document</button>
      </div>

      <button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-[#01358d] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition">
        {saving ? "Saving..." : editId ? "Save Changes" : "Create Project"}
      </button>
    </div>
  );
}
