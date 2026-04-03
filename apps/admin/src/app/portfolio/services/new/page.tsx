"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#01358d] focus:border-[#01358d] outline-none transition text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm";

export default function NewServicePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", emailScript: "", phoneScript: "", meetingScript: "",
  });
  const [urls, setUrls] = useState<{ label: string; url: string }[]>([]);
  const [docs, setDocs] = useState<{ name: string; url: string }[]>([]);

  async function handleSave() {
    if (!form.name.trim()) { alert("Service name is required"); return; }
    setSaving(true);
    const res = await fetch("/api/portfolio/services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, urls, documents: docs }),
    });
    if (res.ok) { const data = await res.json(); router.push(`/portfolio/services/${data.id}`); }
    else alert("Failed to create service");
    setSaving(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Service</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Mobile App Development" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={inputClass + " resize-none"} placeholder="Describe this service..." />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pitch Scripts</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Script</label>
          <textarea value={form.emailScript} onChange={(e) => setForm({ ...form, emailScript: e.target.value })} rows={4} className={inputClass + " resize-none"} placeholder="Email pitch script..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Script</label>
          <textarea value={form.phoneScript} onChange={(e) => setForm({ ...form, phoneScript: e.target.value })} rows={4} className={inputClass + " resize-none"} placeholder="Phone call script..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Script</label>
          <textarea value={form.meetingScript} onChange={(e) => setForm({ ...form, meetingScript: e.target.value })} rows={4} className={inputClass + " resize-none"} placeholder="Meeting pitch script..." />
        </div>
      </div>

      {/* URLs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">URLs / Links</h2>
        {urls.map((u, i) => (
          <div key={i} className="flex gap-2">
            <input value={u.label} onChange={(e) => { const n = [...urls]; n[i].label = e.target.value; setUrls(n); }} className={inputClass} placeholder="Label" />
            <input value={u.url} onChange={(e) => { const n = [...urls]; n[i].url = e.target.value; setUrls(n); }} className={inputClass} placeholder="https://..." />
            <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="text-red-500 text-sm">Remove</button>
          </div>
        ))}
        <button onClick={() => setUrls([...urls, { label: "", url: "" }])} className="text-sm text-[#01358d] dark:text-blue-400 font-medium">+ Add URL</button>
      </div>

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documents / Decks</h2>
        {docs.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input value={d.name} onChange={(e) => { const n = [...docs]; n[i].name = e.target.value; setDocs(n); }} className={inputClass} placeholder="Document name" />
            <input value={d.url} onChange={(e) => { const n = [...docs]; n[i].url = e.target.value; setDocs(n); }} className={inputClass} placeholder="https://docs.google.com/..." />
            <button onClick={() => setDocs(docs.filter((_, j) => j !== i))} className="text-red-500 text-sm">Remove</button>
          </div>
        ))}
        <button onClick={() => setDocs([...docs, { name: "", url: "" }])} className="text-sm text-[#01358d] dark:text-blue-400 font-medium">+ Add Document</button>
      </div>

      <button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-[#01358d] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition">
        {saving ? "Creating..." : "Create Service"}
      </button>
    </div>
  );
}
