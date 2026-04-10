"use client";

import { useParams } from "next/navigation";

export default function StatusPage() {
  const { publicId } = useParams();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Build Status</h1>
      <p className="text-sm text-gray-500 mb-8">Track the progress of your app build.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="space-y-4">
          {["Submitted", "In Review", "Building", "Testing", "Ready"].map((step, i) => (
            <div key={step} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-300"}`}>
                {i + 1}
              </div>
              <div>
                <div className={`text-sm font-medium ${i === 0 ? "text-gray-700" : "text-gray-300"}`}>{step}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-300 mt-6 text-center">Coming in Sprint 4 — real-time build tracking</p>
      </div>
    </main>
  );
}
