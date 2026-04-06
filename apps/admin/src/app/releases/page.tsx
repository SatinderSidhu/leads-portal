"use client";

import { releases } from "../../data/releases";

const BUILD_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA || "dev";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

export default function ReleasesPage() {
  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Release History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Version history and changelog for Leads Portal</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">Current Build</p>
          <p className="text-sm font-mono font-semibold text-[#01358d] dark:text-blue-400">{BUILD_SHA}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(BUILD_TIME).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Build Info Banner */}
      <div className="bg-gradient-to-r from-[#01358d]/5 to-[#2870a8]/5 dark:from-[#01358d]/20 dark:to-[#2870a8]/20 rounded-xl p-4 border border-[#01358d]/10 dark:border-[#01358d]/30 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#01358d]/10 dark:bg-[#01358d]/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#01358d] dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Latest Release: v{releases[0]?.version}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{releases[0]?.changes.length} updates in this version</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{releases.length} releases</span>
          <span>{releases.reduce((sum, r) => sum + r.changes.length, 0)} total changes</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {releases.map((release, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={release.version} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isLatest
                    ? "bg-[#01358d] ring-4 ring-[#01358d]/20"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}>
                  {isLatest && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {idx < releases.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 min-h-[20px]" />
                )}
              </div>

              {/* Release card */}
              <div className={`flex-1 mb-6 rounded-xl border p-5 ${
                isLatest
                  ? "bg-white dark:bg-gray-800 border-[#01358d]/20 dark:border-blue-800 shadow-sm"
                  : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${isLatest ? "text-[#01358d] dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                      v{release.version}
                    </span>
                    {isLatest && (
                      <span className="text-[10px] font-semibold bg-[#01358d] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    <span>{new Date(release.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <a
                      href={`https://github.com/SatinderSidhu/leads-portal/commit/${release.commitId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded hover:text-[#01358d] dark:hover:text-blue-400 transition"
                    >
                      {release.commitId}
                    </a>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLatest ? "text-[#01358d] dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Build <span className="font-mono font-semibold">{BUILD_SHA}</span> &middot; Built {new Date(BUILD_TIME).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
