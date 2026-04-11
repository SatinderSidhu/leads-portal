"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Build {
  id: string;
  version: number;
  status: string;
  submittedAt: string;
  deliveredAt: string | null;
  notes: string | null;
}

const STEPS = [
  { key: "SUBMITTED", label: "Submitted", desc: "Your design has been received by the team" },
  { key: "IN_REVIEW", label: "In Review", desc: "Our team is reviewing your requirements and screens" },
  { key: "BUILDING", label: "Building", desc: "Development is in progress" },
  { key: "TESTING", label: "Testing", desc: "Your app is being tested for quality" },
  { key: "READY", label: "Ready", desc: "Build is complete and ready for review" },
  { key: "DELIVERED", label: "Delivered", desc: "Your app has been delivered" },
];

export default function StatusPage() {
  const { publicId } = useParams() as { publicId: string };
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${publicId}/builds`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setBuilds(d); })
      .finally(() => setLoading(false));
  }, [publicId]);

  const latestBuild = builds[0];
  const currentIdx = latestBuild ? STEPS.findIndex((s) => s.key === latestBuild.status) : -1;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <a href={`/project/${publicId}`} className="text-sm text-gray-400 hover:text-[#01358d] transition">&larr; Back to project</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-2">Build Status</h1>
      <p className="text-sm text-gray-500 mb-8">Track the progress of your app build.</p>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : !latestBuild ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400 mb-4">No build submitted yet</p>
          <a href={`/project/${publicId}/build`} className="text-[#01358d] font-medium hover:underline">Go to Build page</a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs text-gray-400">Build</span>
              <span className="text-lg font-bold text-gray-900 ml-2">v{latestBuild.version}</span>
            </div>
            <span className="text-xs text-gray-400">
              Submitted {new Date(latestBuild.submittedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isComplete = i <= currentIdx;
              const isCurrent = i === currentIdx;

              return (
                <div key={step.key} className="flex items-start gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition ${
                      isComplete ? "bg-[#01358d] border-[#01358d] text-white" : "bg-white border-gray-200 text-gray-300"
                    }`}>
                      {isComplete ? "✓" : i + 1}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`w-0.5 h-12 ${i < currentIdx ? "bg-[#01358d]" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <div className="pt-2 pb-6">
                    <div className={`text-sm font-semibold ${isCurrent ? "text-[#01358d]" : isComplete ? "text-gray-700" : "text-gray-300"}`}>
                      {step.label}
                      {isCurrent && <span className="ml-2 text-xs font-normal text-[#01358d]/60">← Current</span>}
                    </div>
                    <div className={`text-xs mt-0.5 ${isComplete ? "text-gray-500" : "text-gray-300"}`}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {latestBuild.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700"><strong>Team note:</strong> {latestBuild.notes}</p>
            </div>
          )}

          {latestBuild.status === "DELIVERED" && latestBuild.deliveredAt && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl text-center">
              <p className="text-sm text-green-700 font-medium">
                🎉 Your app was delivered on {new Date(latestBuild.deliveredAt).toLocaleDateString()}
              </p>
              <a href={`/project/${publicId}/enhance`} className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">
                Request enhancements →
              </a>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
