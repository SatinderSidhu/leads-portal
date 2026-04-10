"use client";

import { useParams } from "next/navigation";

export default function BuildPage() {
  const { publicId } = useParams();

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Build Your App</h1>
      <p className="text-sm text-gray-500 mb-8">Submit your finalized design for building and configure your app store accounts.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Submit for build */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Submit for Build</h2>
          <div className="flex items-center justify-center h-40 text-sm text-gray-300">
            Coming in Sprint 4 — build submission + contact info capture
          </div>
        </div>

        {/* App Store config */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">App Store Configuration</h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
              <div className="text-sm font-medium text-gray-400">Apple App Store</div>
              <div className="text-xs text-gray-300 mt-1">Coming in Sprint 4</div>
            </div>
            <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
              <div className="text-sm font-medium text-gray-400">Google Play Store</div>
              <div className="text-xs text-gray-300 mt-1">Coming in Sprint 4</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
