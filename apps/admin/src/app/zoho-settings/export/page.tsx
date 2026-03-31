"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";

interface UnexportedLead {
  id: string;
  customerName: string;
  customerEmail: string;
  projectName: string;
  jobTitle: string | null;
  companyName: string | null;
  industry: string | null;
  location: string | null;
  phone: string | null;
}

export default function ExportToZohoPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [leads, setLeads] = useState<UnexportedLead[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<Map<string, { zohoUrl: string }>>(new Map());
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setScanned(false);
    try {
      const res = await fetch("/api/zoho/export-leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setScanned(true);
      } else {
        setError(data.error || "Failed to scan");
      }
    } catch {
      setError("Failed to scan leads");
    } finally {
      setScanning(false);
    }
  }

  async function handleExport(leadId: string) {
    setExporting(leadId);
    try {
      const res = await fetch("/api/zoho/export-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (res.ok) {
        setExported((prev) => new Map(prev).set(leadId, { zohoUrl: data.zohoUrl }));
      } else {
        alert(data.error || "Failed to export");
      }
    } catch {
      alert("Failed to export lead");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportAll() {
    const remaining = leads.filter((l) => !exported.has(l.id));
    if (remaining.length === 0) return;
    if (!confirm(`Export ${remaining.length} lead(s) to Zoho CRM?`)) return;

    for (const lead of remaining) {
      setExporting(lead.id);
      try {
        const res = await fetch("/api/zoho/export-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setExported((prev) => new Map(prev).set(lead.id, { zohoUrl: data.zohoUrl }));
        }
      } catch {
        // continue with others
      }
    }
    setExporting(null);
  }

  const remainingLeads = leads.filter((l) => !exported.has(l.id));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/zoho-settings")}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium transition"
            >
              &larr; Zoho Settings
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Export Leads to Zoho</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">How This Works</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            This tool finds all Leads Portal leads that haven&apos;t been exported to Zoho CRM yet.
            You can export them individually or all at once. Exported leads will be automatically linked to their new Zoho record.
          </p>
        </div>

        {/* Scan Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Portal Leads</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Find leads that exist in Leads Portal but not in Zoho CRM.
              </p>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-[#01358d] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning...
                </>
              ) : (
                "Scan Now"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {scanned && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads Not in Zoho</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {leads.length} lead{leads.length !== 1 ? "s" : ""} found without a Zoho record
                  {exported.size > 0 && <span className="text-green-600 dark:text-green-400"> ({exported.size} exported)</span>}
                </p>
              </div>
              {remainingLeads.length > 1 && (
                <button
                  onClick={handleExportAll}
                  disabled={!!exporting}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition"
                >
                  Export All ({remainingLeads.length})
                </button>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">All Portal leads are already linked to Zoho.</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Nothing to export.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => {
                  const exportResult = exported.get(lead.id);
                  const isExporting = exporting === lead.id;

                  return (
                    <div
                      key={lead.id}
                      className={`border rounded-lg p-4 transition ${
                        exportResult
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.customerName}</p>
                            {lead.jobTitle && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">({lead.jobTitle})</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{lead.customerEmail}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">Project:</span> {lead.projectName}
                            </span>
                            {lead.companyName && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Company:</span> {lead.companyName}
                              </span>
                            )}
                            {lead.industry && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Industry:</span> {lead.industry}
                              </span>
                            )}
                            {lead.location && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Location:</span> {lead.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {exportResult ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                Exported
                              </span>
                              <a
                                href={exportResult.zohoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                              >
                                View in Zoho
                              </a>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleExport(lead.id)}
                                disabled={isExporting || !!exporting}
                                className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md disabled:opacity-50 transition"
                              >
                                {isExporting ? "Exporting..." : "Export to Zoho"}
                              </button>
                              <button
                                onClick={() => router.push(`/leads/${lead.id}`)}
                                className="text-xs text-[#01358d] dark:text-blue-400 hover:underline"
                              >
                                View Lead
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
