"use client";

import { useParams } from "next/navigation";

export default function EnhancePage() {
  const { publicId } = useParams();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Enhance Your App</h1>
      <p className="text-sm text-gray-500 mb-8">Request changes and improvements to your delivered app.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center text-gray-300">
          <p className="text-sm font-medium">Enhancement Requests</p>
          <p className="text-xs mt-1">Coming in Sprint 5 — describe changes, AI generates diff, re-submit for build</p>
        </div>
      </div>
    </main>
  );
}
