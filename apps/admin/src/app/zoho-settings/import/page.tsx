"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";

interface ZohoOnlyLead {
  zohoLeadId: string;
  name: string;
  email: string;
  company: string;
  jobTitle: string;
  phone: string;
  industry: string;
  location: string;
  zohoUrl: string;
}

export default function ImportZohoLeadsPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [leads, setLeads] = useState<ZohoOnlyLead[]>([]);
  const [totalZoho, setTotalZoho] = useState(0);
  const [importing, setImporting] = useState<string | null>(null);
  const [imported, setImported] = useState<Map<string, { action: string; leadId: string }>>(new Map());
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setScanned(false);
    try {
      const res = await fetch("/api/zoho/import-leads");
      const data = await res.json();
      if (res.ok) {
        setLeads(data.leads || []);
        setTotalZoho(data.totalZoho || 0);
        setScanned(true);
      } else {
        setError(data.error || "Failed to scan");
      }
    } catch {
      setError("Failed to scan Zoho leads");
    } finally {
      setScanning(false);
    }
  }

  async function handleImport(zohoLeadId: string) {
    setImporting(zohoLeadId);
    try {
      const res = await fetch("/api/zoho/import-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zohoLeadId }),
      });
      const data = await res.json();
      if (res.ok) {
        setImported((prev) => new Map(prev).set(zohoLeadId, { action: data.action, leadId: data.leadId }));
      } else {
        alert(data.error || "Failed to import");
      }
    } catch {
      alert("Failed to import lead");
    } finally {
      setImporting(null);
    }
  }

  async function handleImportAll() {
    const remaining = leads.filter((l) => !imported.has(l.zohoLeadId));
    if (remaining.length === 0) return;
    if (!confirm(`Import ${remaining.length} lead(s) from Zoho into Leads Portal?`)) return;

    for (const lead of remaining) {
      setImporting(lead.zohoLeadId);
      try {
        const res = await fetch("/api/zoho/import-leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zohoLeadId: lead.zohoLeadId }),
        });
        const data = await res.json();
        if (res.ok) {
          setImported((prev) => new Map(prev).set(lead.zohoLeadId, { action: data.action, leadId: data.leadId }));
        }
      } catch {
        // continue with others
      }
    }
    setImporting(null);
  }

  const remainingLeads = leads.filter((l) => !imported.has(l.zohoLeadId));

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Import Leads from Zoho</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Info */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-6">
          <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">How This Works</h3>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            This tool fetches all leads from Zoho CRM and finds ones that don&apos;t exist in Leads Portal (by email).
            You can then import them individually or all at once. Imported leads will be automatically linked to their Zoho record.
          </p>
        </div>

        {/* Scan Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan Zoho CRM</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Fetch all leads from Zoho and find ones not yet in Leads Portal.
              </p>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning Zoho...
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Zoho-Only Leads</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {totalZoho} total Zoho leads scanned, {leads.length} not in Leads Portal
                  {imported.size > 0 && <span className="text-green-600 dark:text-green-400"> ({imported.size} imported)</span>}
                </p>
              </div>
              {remainingLeads.length > 1 && (
                <button
                  onClick={handleImportAll}
                  disabled={!!importing}
                  className="bg-[#01358d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#012a70] disabled:opacity-50 transition"
                >
                  Import All ({remainingLeads.length})
                </button>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">All Zoho leads already exist in Leads Portal.</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Nothing to import.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => {
                  const importResult = imported.get(lead.zohoLeadId);
                  const isImporting = importing === lead.zohoLeadId;

                  return (
                    <div
                      key={lead.zohoLeadId}
                      className={`border rounded-lg p-4 transition ${
                        importResult
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{lead.name}</p>
                            {lead.jobTitle && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">({lead.jobTitle})</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{lead.email}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            {lead.company && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Company:</span> {lead.company}
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
                            {lead.phone && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Phone:</span> {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {importResult ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                                {importResult.action === "linked" ? "Linked" : "Imported"}
                              </span>
                              <button
                                onClick={() => router.push(`/leads/${importResult.leadId}`)}
                                className="text-xs text-[#01358d] dark:text-blue-400 hover:underline"
                              >
                                Open Lead
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleImport(lead.zohoLeadId)}
                              disabled={isImporting || !!importing}
                              className="text-sm font-medium text-white bg-[#01358d] hover:bg-[#012a70] px-3 py-1.5 rounded-md disabled:opacity-50 transition"
                            >
                              {isImporting ? "Importing..." : "Import"}
                            </button>
                          )}
                          <a
                            href={lead.zohoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            View in Zoho
                          </a>
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
