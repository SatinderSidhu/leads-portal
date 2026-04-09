"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOAL_LABELS: Record<string, string> = {
  BOOK_MEETING: "Book a Meeting",
  GET_REPLY: "Get a Reply",
  DRIVE_PURCHASE: "Drive a Purchase",
  NURTURE_ONLY: "Nurture Only",
};

const GOAL_COLORS: Record<string, string> = {
  BOOK_MEETING: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  GET_REPLY: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  DRIVE_PURCHASE: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  NURTURE_ONLY: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PAUSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

interface Sequence {
  id: string;
  name: string;
  goal: string;
  status: string;
  enrollmentTrigger: string;
  createdAt: string;
  _count: { steps: number; enrollments: number };
}

export default function SequencesListPage() {
  const router = useRouter();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sequences")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSequences(data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Smart Sequences</h1>
        <button
          onClick={() => router.push("/sequences/new")}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          + New Sequence
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading sequences...</p>
      ) : sequences.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">No sequences yet</p>
          <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">Create a form-driven email sequence with structured delays, branching, and contact tracking.</p>
          <button
            onClick={() => router.push("/sequences/new")}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            Create your first sequence
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Goal</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Steps</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrolled</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trigger</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sequences.map((seq) => (
                  <tr
                    key={seq.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                    onClick={() => router.push(`/sequences/${seq.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{seq.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${GOAL_COLORS[seq.goal] || "bg-gray-100 text-gray-800"}`}>
                        {GOAL_LABELS[seq.goal] || seq.goal}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[seq.status] || "bg-gray-100 text-gray-800"}`}>
                        {seq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {seq._count.steps} steps
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                        {seq._count.enrollments}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {seq.enrollmentTrigger.replace("_", " ").toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(seq.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
