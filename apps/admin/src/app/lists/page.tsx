"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TYPE_COLORS: Record<string, string> = {
  STATIC: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DYNAMIC: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

interface ContactList {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isSuppression: boolean;
  lastRefreshedAt: string | null;
  createdAt: string;
  _count: { members: number; triggeredSequences: number };
}

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "STATIC" | "DYNAMIC">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter !== "ALL") params.set("type", filter);
    if (search) params.set("search", search);
    fetch(`/api/lists?${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLists(data); })
      .finally(() => setLoading(false));
  }, [filter, search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Contact Lists</h1>
        <button onClick={() => router.push("/lists/new")} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
          + New List
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lists..."
          className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-gray-700 w-64"
        />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(["ALL", "STATIC", "DYNAMIC"] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === t ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
              {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading lists...</p>
      ) : lists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-gray-900 dark:text-white font-semibold mb-1">No lists yet</p>
          <p className="text-gray-400 text-sm mb-5 max-w-sm mx-auto">Create static lists for specific campaigns or dynamic lists that auto-update based on filter rules.</p>
          <button onClick={() => router.push("/lists/new")} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 transition">Create your first list</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contacts</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sequences</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {lists.map((list) => (
                <tr key={list.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer" onClick={() => router.push(`/lists/${list.id}`)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{list.name}</span>
                      {list.isSuppression && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Suppression</span>
                      )}
                    </div>
                    {list.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{list.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[list.type]}`}>{list.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">{list._count.members}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{list._count.triggeredSequences || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(list.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
