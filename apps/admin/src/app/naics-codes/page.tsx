"use client";

import { useEffect, useState } from "react";

interface Subsector { id: string; code: string; name: string }
interface Sector { id: string; code: string; name: string; subsectors: Subsector[] }

export default function NaicsCodesPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/naics").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setSectors(d);
    }).finally(() => setLoading(false));
  }, []);

  async function handleSeed() {
    setSeeding(true);
    const res = await fetch("/api/naics/seed", { method: "POST" });
    const data = await res.json();
    alert(`Loaded ${data.sectorsCreated} sectors and ${data.subsectorsCreated} subsectors`);
    // Reload
    const refreshed = await fetch("/api/naics").then((r) => r.json());
    if (Array.isArray(refreshed)) setSectors(refreshed);
    setSeeding(false);
  }

  const filtered = search
    ? sectors.filter((s) =>
        s.code.includes(search) || s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.subsectors.some((sub) => sub.code.includes(search) || sub.name.toLowerCase().includes(search.toLowerCase()))
      )
    : sectors;

  const totalSubsectors = sectors.reduce((sum, s) => sum + s.subsectors.length, 0);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#01358d]" /></div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NAICS Industry Codes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {sectors.length} sectors, {totalSubsectors} subsectors
          </p>
        </div>
        {sectors.length === 0 && (
          <button onClick={handleSeed} disabled={seeding} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">
            {seeding ? "Loading..." : "Load NAICS Codes"}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or name..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-[#01358d]"
        />
      </div>

      {/* Sectors */}
      <div className="space-y-2">
        {filtered.map((sector) => (
          <div key={sector.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setExpandedSector(expandedSector === sector.id ? null : sector.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-[#01358d] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{sector.code}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{sector.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{sector.subsectors.length} subsectors</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-400 transition-transform ${expandedSector === sector.id ? "rotate-180" : ""}`}>
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </button>

            {expandedSector === sector.id && sector.subsectors.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {sector.subsectors.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 py-1.5">
                      <span className="text-xs font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded">{sub.code}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{sub.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
