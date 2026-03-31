"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../components/ThemeToggle";

interface ZohoMatch {
  portalLeadId: string;
  portalName: string;
  portalEmail: string;
  portalProject: string;
  zohoLeadId: string;
  zohoName: string;
  zohoCompany: string;
  zohoUrl: string;
}

export default function UnlinkedLeadsPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [matches, setMatches] = useState<ZohoMatch[]>([]);
  const [totalUnlinked, setTotalUnlinked] = useState(0);
  const [linking, setLinking] = useState<string | null>(null);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setScanned(false);
    try {
      const res = await fetch("/api/zoho/find-unlinked");
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
        setTotalUnlinked(data.totalUnlinked || 0);
        setScanned(true);
      } else {
        setError(data.error || "Failed to scan");
      }
    } catch {
      setError("Failed to scan for unlinked leads");
    } finally {
      setScanning(false);
    }
  }

  async function handleLink(portalLeadId: string, zohoLeadId: string) {
    setLinking(portalLeadId);
    try {
      const res = await fetch("/api/zoho/find-unlinked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: portalLeadId, zohoLeadId }),
      });
      if (res.ok) {
        setLinked((prev) => new Set(prev).add(portalLeadId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to link");
      }
    } catch {
      alert("Failed to link lead");
    } finally {
      setLinking(null);
    }
  }

  async function handleLinkAll() {
    const unlinked = matches.filter((m) => !linked.has(m.portalLeadId));
    if (unlinked.length === 0) return;
    if (!confirm(`Link all ${unlinked.length} matched leads to their Zoho records?`)) return;

    for (const match of unlinked) {
      setLinking(match.portalLeadId);
      try {
        const res = await fetch("/api/zoho/find-unlinked", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: match.portalLeadId, zohoLeadId: match.zohoLeadId }),
        });
        if (res.ok) {
          setLinked((prev) => new Set(prev).add(match.portalLeadId));
        }
      } catch {
        // continue with others
      }
    }
    setLinking(null);
  }

  const unlinkedMatches = matches.filter((m) => !linked.has(m.portalLeadId));

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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Find Unlinked Zoho Leads</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">How This Works</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            This tool scans all Leads Portal leads that aren&apos;t linked to Zoho CRM and searches Zoho by email address.
            If a matching lead is found in Zoho, you can link them together so they stay in sync.
          </p>
        </div>

        {/* Scan Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan for Matches</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Search Zoho CRM for leads matching unlinked Portal leads by email address.
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Results</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {totalUnlinked} unlinked leads scanned, {matches.length} match{matches.length !== 1 ? "es" : ""} found in Zoho
                  {linked.size > 0 && <span className="text-green-600 dark:text-green-400"> ({linked.size} linked)</span>}
                </p>
              </div>
              {unlinkedMatches.length > 1 && (
                <button
                  onClick={handleLinkAll}
                  disabled={!!linking}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                >
                  Link All ({unlinkedMatches.length})
                </button>
              )}
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No matching leads found in Zoho CRM.</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">All unlinked Portal leads have no email match in Zoho.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => {
                  const isLinked = linked.has(match.portalLeadId);
                  const isLinking = linking === match.portalLeadId;

                  return (
                    <div
                      key={match.portalLeadId}
                      className={`border rounded-lg p-4 transition ${
                        isLinked
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Portal side */}
                            <div>
                              <p className="text-xs font-semibold text-[#01358d] dark:text-blue-400 uppercase tracking-wider mb-1">Leads Portal</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.portalName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{match.portalEmail}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{match.portalProject}</p>
                            </div>
                            {/* Zoho side */}
                            <div>
                              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Zoho CRM</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{match.zohoName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{match.portalEmail}</p>
                              {match.zohoCompany && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{match.zohoCompany}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2">
                          {isLinked ? (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              Linked
                            </span>
                          ) : (
                            <button
                              onClick={() => handleLink(match.portalLeadId, match.zohoLeadId)}
                              disabled={isLinking || !!linking}
                              className="text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md disabled:opacity-50 transition"
                            >
                              {isLinking ? "Linking..." : "Link"}
                            </button>
                          )}
                          <a
                            href={match.zohoUrl}
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
